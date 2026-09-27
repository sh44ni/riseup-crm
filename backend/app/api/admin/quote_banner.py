from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import Dict, Any
import os
import uuid
import orjson

from app.core.database import get_db
from app.core.redis import cache_get, cache_set, cache_delete
from app.core.permissions import require_auth_user, require_permission
from app.models.quote_banner import QuoteBanner, QuoteBannerSlide
from app.schemas.quote_banner import (
    QuoteBannerConfigPayload,
    QuoteBannerResponse,
    QuoteSlidePayload,
)

router = APIRouter(prefix="/quote-banner", tags=["Admin Quote Banner"])
CACHE_KEY = "crm:quote_banner:config"

def get_user_identifier(user: Any) -> str:
    if hasattr(user, "email") and user.email:
        return user.email
    if hasattr(user, "name") and user.name:
        return user.name
    if isinstance(user, dict):
        return user.get("email") or user.get("name") or "admin"
    return "admin"

@router.get("", response_model=QuoteBannerResponse, response_model_by_alias=True, response_model_exclude_none=False)
async def get_quote_banner(
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    cached = await cache_get(CACHE_KEY)
    if cached:
        try:
            return orjson.loads(cached)
        except Exception:
            pass

    stmt = select(QuoteBanner).where(QuoteBanner.id == "default")
    result = await db.execute(stmt)
    banner = result.scalar_one_or_none()

    if not banner:
        banner = QuoteBanner(
            id="default",
            mode="single",
            single_image_url="/hero-bg.jpg",
            autoplay=True,
            slide_duration=5,
            transition_effect="fade",
            card_height="balanced",
            image_fit="cover",
        )
        db.add(banner)
        await db.commit()
        await db.refresh(banner)

    payload = QuoteBannerConfigPayload(
        mode=banner.mode,
        single_image_url=banner.single_image_url,
        slides=[
            QuoteSlidePayload(
                id=s.id,
                image_url=s.image_url,
                title=s.title,
                alt_text=s.alt_text,
            )
            for s in (banner.slides or [])
        ],
        autoplay=banner.autoplay,
        slide_duration=banner.slide_duration,
        transition_effect=banner.transition_effect,
        card_height=banner.card_height,
        image_fit=banner.image_fit,
        link_url=banner.link_url,
    )

    response = QuoteBannerResponse(success=True, data=payload)
    await cache_set(CACHE_KEY, orjson.dumps(response.model_dump(mode="json", by_alias=True)).decode("utf-8"), ttl_seconds=3600)
    return response



@router.put("", response_model=QuoteBannerResponse, response_model_by_alias=True)
async def update_quote_banner(
    payload: QuoteBannerConfigPayload,
    user: Any = Depends(require_permission("settings:edit")),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(QuoteBanner).where(QuoteBanner.id == "default")
    result = await db.execute(stmt)
    banner = result.scalar_one_or_none()

    if not banner:
        banner = QuoteBanner(id="default")
        db.add(banner)

    banner.mode = payload.mode
    banner.single_image_url = payload.single_image_url
    banner.autoplay = payload.autoplay
    banner.slide_duration = payload.slide_duration
    banner.transition_effect = payload.transition_effect
    banner.card_height = payload.card_height
    banner.image_fit = payload.image_fit
    banner.link_url = payload.link_url
    banner.updated_by = get_user_identifier(user)

    await db.execute(delete(QuoteBannerSlide).where(QuoteBannerSlide.banner_id == "default"))
    for idx, s in enumerate(payload.slides):
        slide = QuoteBannerSlide(
            id=s.id or f"slide-{uuid.uuid4().hex[:8]}",
            banner_id="default",
            image_url=s.image_url,
            title=s.title,
            alt_text=s.alt_text,
            sort_order=idx,
        )
        db.add(slide)

    await db.commit()
    await db.refresh(banner)
    await cache_delete(CACHE_KEY)

    return QuoteBannerResponse(success=True, data=payload, message="Quote banner updated successfully")


@router.post("/upload", response_model=Dict[str, Any])
async def upload_quote_banner_image(
    file: UploadFile = File(...),
    user: Any = Depends(require_permission("settings:edit")),
):
    allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"]
    if file.content_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format {file.content_type}."
        )

    mime_to_ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}
    ext = mime_to_ext.get((file.content_type or "").lower(), "webp")
    unique_name = f"quote_{uuid.uuid4().hex[:10]}.{ext}"
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "quotes")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, unique_name)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    public_url = f"/static/uploads/quotes/{unique_name}"
    return {
        "success": True,
        "data": {"url": public_url},
        "message": "Image uploaded successfully",
    }
