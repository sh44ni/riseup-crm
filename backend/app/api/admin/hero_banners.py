from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import uuid
import os
import orjson

from app.core.database import get_db
from app.core.redis import cache_get, cache_set, cache_delete
from app.core.permissions import require_auth_user, require_permission
from app.models.hero_banner import HeroBanner
from app.schemas.hero_banner import (
    HeroBannerResponse,
    HeroBannerSaveRequest,
)

router = APIRouter(prefix="/hero-banners", tags=["Admin Hero Banners"])
REDIS_KEY = "crm:hero_banners:map"

def get_user_identifier(user: Any) -> str:
    if hasattr(user, "email") and user.email:
        return user.email
    if hasattr(user, "name") and user.name:
        return user.name
    if isinstance(user, dict):
        return user.get("email") or user.get("name") or "admin"
    return "admin"

@router.get("", response_model=Dict[str, Any])
async def get_all_hero_banners(
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    cached = await cache_get(REDIS_KEY)
    if cached:
        try:
            return orjson.loads(cached)
        except Exception:
            pass

    result = await db.execute(select(HeroBanner))
    rows = result.scalars().all()
    
    global_banner = None
    pages_map = {}
    
    for row in rows:
        serialized = HeroBannerResponse.model_validate(row).model_dump(mode="json")
        if row.page_id == "global" or row.is_global:
            global_banner = serialized
        else:
            pages_map[row.page_id] = serialized

    response_payload = {
        "success": True,
        "data": {
            "global_banner": global_banner,
            "pages": pages_map,
        }
    }
    
    await cache_set(REDIS_KEY, orjson.dumps(response_payload).decode("utf-8"), ttl_seconds=300)
    return response_payload


@router.get("/{page_id}", response_model=Dict[str, Any])
async def get_hero_banner(
    page_id: str,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(HeroBanner).where(HeroBanner.page_id == page_id))
    banner = result.scalar_one_or_none()
    if not banner:
        res_global = await db.execute(select(HeroBanner).where(HeroBanner.page_id == "global"))
        banner = res_global.scalar_one_or_none()

    if not banner:
        raise HTTPException(status_code=404, detail="Hero banner not found")

    return {
        "success": True,
        "data": HeroBannerResponse.model_validate(banner).model_dump(mode="json"),
    }


@router.put("/{page_id}", response_model=Dict[str, Any])
async def update_hero_banner(
    page_id: str,
    payload: HeroBannerSaveRequest,
    user: Any = Depends(require_permission("settings:edit")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(HeroBanner).where(HeroBanner.page_id == page_id))
    banner = result.scalar_one_or_none()
    
    if not banner:
        banner = HeroBanner(page_id=page_id)
        db.add(banner)
        
    banner.image_url = payload.image_url
    banner.zoom = payload.zoom
    banner.position_x = payload.position_x
    banner.position_y = payload.position_y
    banner.opacity = payload.opacity
    banner.overlay_strength = payload.overlay_strength
    banner.eyebrow = payload.eyebrow
    banner.title = payload.title
    banner.subtitle = payload.subtitle
    banner.updated_by = get_user_identifier(user)

    if payload.apply_globally:
        global_res = await db.execute(select(HeroBanner).where(HeroBanner.page_id == "global"))
        g_banner = global_res.scalar_one_or_none()
        if not g_banner:
            g_banner = HeroBanner(page_id="global", is_global=True)
            db.add(g_banner)
        g_banner.image_url = payload.image_url
        g_banner.zoom = payload.zoom
        g_banner.position_x = payload.position_x
        g_banner.position_y = payload.position_y
        g_banner.opacity = payload.opacity
        g_banner.overlay_strength = payload.overlay_strength
        g_banner.updated_by = banner.updated_by

    await db.commit()
    await db.refresh(banner)
    await cache_delete(REDIS_KEY)

    return {
        "success": True,
        "data": HeroBannerResponse.model_validate(banner).model_dump(mode="json"),
        "message": f"Hero banner for '{page_id}' saved successfully"
    }


@router.delete("/{page_id}", response_model=Dict[str, Any])
async def delete_hero_banner(
    page_id: str,
    user: Any = Depends(require_permission("settings:edit")),
    db: AsyncSession = Depends(get_db),
):
    if page_id == "global":
        raise HTTPException(status_code=400, detail="Cannot delete global default banner")

    result = await db.execute(select(HeroBanner).where(HeroBanner.page_id == page_id))
    banner = result.scalar_one_or_none()
    if banner:
        await db.delete(banner)
        await db.commit()
        await cache_delete(REDIS_KEY)

    return {"success": True, "message": f"Page hero '{page_id}' reset to global defaults"}


@router.post("/upload", response_model=Dict[str, Any])
async def upload_hero_image(
    file: UploadFile = File(...),
    user: Any = Depends(require_permission("settings:edit")),
):
    allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format {file.content_type}. Use JPG, PNG, WebP, or AVIF."
        )

    mime_to_ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}
    ext = mime_to_ext.get((file.content_type or "").lower(), "webp")
    unique_name = f"hero_{uuid.uuid4().hex[:10]}.{ext}"
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "hero")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, unique_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    public_url = f"/static/uploads/hero/{unique_name}"
    return {
        "success": True,
        "data": {
            "url": public_url,
            "filename": unique_name,
            "content_type": file.content_type,
            "size_bytes": len(content),
        }
    }
