"""Per-user UI customization persistence (ORM only) with a write-through Redis cache."""
from typing import Any, Dict, Optional

import orjson
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import cache_delete, cache_get, cache_set
from app.models.user_customization import UserUiCustomization
from app.schemas.customization import (
    HERO_PAGE_PREFIX,
    SLOT_HERO_ALL,
    slot_type,
    validate_slot_config,
)

CACHE_TTL_SECONDS = 600
HERO_FRAMING_FIELDS = ("image_url", "zoom", "position_x", "position_y", "opacity", "overlay_strength")
HERO_TEXT_FIELDS = ("eyebrow", "title", "subtitle")


def _cache_key(user_id: int) -> str:
    return f"crm:customizations:{user_id}"


def _is_empty(config: Dict[str, Any]) -> bool:
    return all(v in (None, "") for v in config.values())


async def _load_map(db: AsyncSession, user_id: int) -> Dict[str, Dict[str, Any]]:
    rows = (
        await db.execute(select(UserUiCustomization).where(UserUiCustomization.user_id == user_id))
    ).scalars().all()
    return {r.slot_key: dict(r.config or {}) for r in rows}


async def _refresh_cache(user_id: int, data: Dict[str, Dict[str, Any]]) -> None:
    # Write-through after commit: the cache is always recomputed from the DB, never invalidated.
    try:
        await cache_set(_cache_key(user_id), orjson.dumps(data).decode("utf-8"), ttl_seconds=CACHE_TTL_SECONDS)
    except Exception:
        await cache_delete(_cache_key(user_id))


async def get_user_map(db: AsyncSession, user_id: int) -> Dict[str, Dict[str, Any]]:
    cached = await cache_get(_cache_key(user_id))
    if cached:
        try:
            return orjson.loads(cached)
        except Exception:
            pass
    data = await _load_map(db, user_id)
    await _refresh_cache(user_id, data)
    return data


async def _upsert(db: AsyncSession, user_id: int, slot_key: str, config: Dict[str, Any]) -> None:
    row = await db.get(UserUiCustomization, (user_id, slot_key))
    if row is None:
        db.add(UserUiCustomization(user_id=user_id, slot_key=slot_key, config=config))
    else:
        row.config = config


async def save_slot(
    db: AsyncSession,
    user_id: int,
    slot_key: str,
    raw: Dict[str, Any],
    apply_to_all: bool = False,
) -> Dict[str, Dict[str, Any]]:
    """Validate and store one slot. Returns the user's full customization map."""
    config = validate_slot_config(slot_key, raw)
    family = slot_type(slot_key)

    if family == "hero_page" and apply_to_all:
        all_cfg = {k: config.get(k) for k in HERO_FRAMING_FIELDS}
        all_cfg.update({k: None for k in HERO_TEXT_FIELDS})
        await _upsert(db, user_id, SLOT_HERO_ALL, all_cfg)
        # Every page now inherits the shared image/framing; pages keep only their own text.
        existing = await _load_map(db, user_id)
        for key, cfg in existing.items():
            if key.startswith(HERO_PAGE_PREFIX) and key != SLOT_HERO_ALL and key != slot_key:
                stripped = {**cfg, **{f: None for f in HERO_FRAMING_FIELDS}}
                if _is_empty(stripped):
                    await db.execute(
                        delete(UserUiCustomization).where(
                            UserUiCustomization.user_id == user_id,
                            UserUiCustomization.slot_key == key,
                        )
                    )
                else:
                    await _upsert(db, user_id, key, stripped)
        config = {**config, **{f: None for f in HERO_FRAMING_FIELDS}}

    if family in ("hero_page",) and _is_empty(config):
        await db.execute(
            delete(UserUiCustomization).where(
                UserUiCustomization.user_id == user_id, UserUiCustomization.slot_key == slot_key
            )
        )
    else:
        await _upsert(db, user_id, slot_key, config)

    await db.commit()
    data = await _load_map(db, user_id)
    await _refresh_cache(user_id, data)
    return data


async def delete_slot(db: AsyncSession, user_id: int, slot_key: str) -> Dict[str, Dict[str, Any]]:
    await db.execute(
        delete(UserUiCustomization).where(
            UserUiCustomization.user_id == user_id, UserUiCustomization.slot_key == slot_key
        )
    )
    await db.commit()
    data = await _load_map(db, user_id)
    await _refresh_cache(user_id, data)
    return data


def sniff_image_size(content: bytes) -> Optional[Dict[str, int]]:
    """Return {'width','height'} using Pillow, or None when the format can't be decoded (e.g. AVIF)."""
    try:
        import io

        from PIL import Image

        with Image.open(io.BytesIO(content)) as img:
            return {"width": img.width, "height": img.height}
    except Exception:
        return None
