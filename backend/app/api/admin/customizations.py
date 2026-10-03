"""Per-user UI customizations (hero banners, quote banner, weather widget, sidebar photo).

Every user manages only their own customizations; no admin permission is required.
"""
import os
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.permissions import require_auth_user
from app.schemas.customization import (
    CustomizationSaveResponse,
    CustomizationsMapResponse,
    slot_type,
)
from app.services import customizations as svc

class CustomizationPayload(BaseModel):
    """Slot-specific body; the strict per-slot model validates it in the service layer."""

    model_config = ConfigDict(extra="allow")


router = APIRouter(prefix="/me/customizations", tags=["My Customizations"])

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
_MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}


def _own_user_id(user: Any) -> int:
    if getattr(user, "is_api_key", False) or getattr(user, "kind", "user") == "api_key":
        raise HTTPException(status_code=403, detail="API keys cannot manage personal customizations")
    user_id = getattr(user, "user_id", None) or getattr(user, "id", None)
    if not user_id:
        raise HTTPException(status_code=403, detail="A signed-in user is required")
    return int(user_id)


def _check_slot(slot_key: str) -> None:
    if slot_type(slot_key) is None:
        raise HTTPException(status_code=400, detail=f"Unknown customization slot '{slot_key}'")


@router.get("", response_model=CustomizationsMapResponse)
async def get_my_customizations(
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    data = await svc.get_user_map(db, _own_user_id(user))
    return {"success": True, "data": data}


@router.post("/upload", response_model=Dict[str, Any])
async def upload_customization_image(
    file: UploadFile = File(...),
    user: Any = Depends(require_auth_user()),
):
    user_id = _own_user_id(user)
    ext = _MIME_TO_EXT.get((file.content_type or "").lower())
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format {file.content_type}. Use JPG, PNG, WebP, or AVIF.",
        )
    chunks = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 8 MB.")
        chunks.append(chunk)
    content = b"".join(chunks)
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "customizations", str(user_id)
    )
    os.makedirs(upload_dir, exist_ok=True)
    with open(os.path.join(upload_dir, unique_name), "wb") as f:
        f.write(content)

    size = svc.sniff_image_size(content) or {}
    return {
        "success": True,
        "data": {
            "url": f"/static/uploads/customizations/{user_id}/{unique_name}",
            "content_type": file.content_type,
            "size_bytes": len(content),
            "width": size.get("width"),
            "height": size.get("height"),
        },
    }


@router.put("/{slot_key}", response_model=CustomizationSaveResponse)
async def save_my_customization(
    slot_key: str,
    payload: CustomizationPayload,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = _own_user_id(user)
    _check_slot(slot_key)
    body = payload.model_dump()
    apply_to_all = bool(body.get("apply_to_all", False))
    try:
        data = await svc.save_slot(db, user_id, slot_key, body, apply_to_all=apply_to_all)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors(include_url=False, include_context=False))
    return {"success": True, "data": data, "message": "Customization saved"}


@router.delete("/{slot_key}", response_model=CustomizationSaveResponse)
async def reset_my_customization(
    slot_key: str,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = _own_user_id(user)
    _check_slot(slot_key)
    data = await svc.delete_slot(db, user_id, slot_key)
    return {"success": True, "data": data, "message": "Customization reset"}
