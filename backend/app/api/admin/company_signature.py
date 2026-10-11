"""
Company Signature Administration Routes
=======================================
One company contractor signature (Edith Guerrero) replaces the old per-user
"Authorized Signatories". Access is controlled per role via ``roles.signature_access``:

* ``view`` – see the signature and its history
* ``use``  – apply it when counter-signing contracts (see ``contracts.counter_sign_contract``)
* ``edit`` – set it up and change it

Every save is written to the append-only ``company_signature_versions`` table. The first
save is logged as "configured"; every later change must include a reason.
"""

import re
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import get_client_ip, record_audit_log
from app.core.database import get_db
from app.core.logger import get_logger
from app.middlewares.auth import require_auth, require_signature_access
from app.services.company_signature import (
    TRACKED_FIELDS,
    get_current_signature,
    get_signature_status,
    get_signature_version,
    list_signature_history,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin/company-signature", tags=["Company Signature"])

# Serialises concurrent saves so version numbers stay gap-free and "configured" happens once.
_SIGNATURE_LOCK_KEY = 7_311_420_517
MIN_REASON_LENGTH = 5
MAX_DRAWN_DATA_LENGTH = 700_000  # ~500 KB PNG data-URL
_PNG_DATA_URL = re.compile(r"^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$")


class UpdateCompanySignatureRequest(BaseModel):
    signer_name: str = Field(..., min_length=2, max_length=150)
    signer_title: str = Field(..., min_length=2, max_length=100)
    signature_type: Literal["typed", "drawn"]
    signature_data: str = Field(..., min_length=1, max_length=MAX_DRAWN_DATA_LENGTH)
    reason: Optional[str] = Field(None, max_length=500)
    expected_version: Optional[int] = Field(None, ge=0)

    @field_validator("signer_name", "signer_title", "signature_data")
    @classmethod
    def _strip_required(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, v: Optional[str]) -> Optional[str]:
        v = (v or "").strip()
        return v or None

    def validated_signature_data(self) -> str:
        if self.signature_type == "drawn":
            if not _PNG_DATA_URL.match(self.signature_data):
                raise HTTPException(status_code=422, detail="A drawn signature must be a PNG image.")
        elif len(self.signature_data) > 150:
            raise HTTPException(status_code=422, detail="A typed signature must be 150 characters or fewer.")
        return self.signature_data


@router.get("/status")
async def get_company_signature_status(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_auth),
):
    """Image-free status. Any signed-in user may check whether the signature is configured."""
    return await get_signature_status(db)


@router.get("")
async def get_company_signature(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_signature_access("view")),
):
    signature = await get_current_signature(db)
    return {
        "configured": signature is not None,
        "access": current_user.signature_access,
        "signature": signature,
    }


@router.get("/history")
async def get_company_signature_history(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_signature_access("view")),
):
    return {"history": await list_signature_history(db)}


@router.get("/history/{version}")
async def get_company_signature_history_version(
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_signature_access("view")),
):
    entry = await get_signature_version(db, version)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Signature version {version} not found")
    return entry


@router.put("")
async def update_company_signature(
    payload: UpdateCompanySignatureRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_signature_access("edit")),
):
    signature_data = payload.validated_signature_data()

    await db.execute(text("SELECT pg_advisory_xact_lock(:k)"), {"k": _SIGNATURE_LOCK_KEY})
    current = await get_current_signature(db)
    current_version = current["version"] if current else 0

    if payload.expected_version is not None and payload.expected_version != current_version:
        raise HTTPException(
            status_code=409,
            detail="The company signature was changed by someone else while you were editing. Reload and try again.",
        )

    proposed = {
        "signer_name": payload.signer_name,
        "signer_title": payload.signer_title,
        "signature_type": payload.signature_type,
        "signature_data": signature_data,
    }

    if current is None:
        action = "configured"
        changed_fields = list(TRACKED_FIELDS)
        reason = payload.reason
    else:
        action = "updated"
        changed_fields = [f for f in TRACKED_FIELDS if proposed[f] != current.get(f)]
        if not changed_fields:
            raise HTTPException(status_code=400, detail="Nothing changed — the signature is already saved like this.")
        reason = payload.reason
        if not reason or len(reason) < MIN_REASON_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"A reason (at least {MIN_REASON_LENGTH} characters) is required to change the company signature.",
            )

    new_version = current_version + 1
    changed_by_name = (getattr(current_user, "name", None) or current_user.email or "Unknown user").strip()

    await db.execute(
        text("""
            INSERT INTO company_signature_versions (
                version, action, signer_name, signer_title, signature_type, signature_data,
                reason, changed_fields, changed_by_user_id, changed_by_name, changed_by_email, ip_address
            ) VALUES (
                :version, :action, :signer_name, :signer_title, :signature_type, :signature_data,
                :reason, :changed_fields, :uid, :uname, :uemail, :ip
            )
        """),
        {
            "version": new_version,
            "action": action,
            **proposed,
            "reason": reason,
            "changed_fields": changed_fields,
            "uid": current_user.id,
            "uname": changed_by_name,
            "uemail": current_user.email,
            "ip": get_client_ip(request),
        },
    )

    await record_audit_log(
        db=db,
        action=f"company_signature.{action}",
        resource_type="company_signature",
        resource_id=new_version,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "version": new_version,
            "action": action,
            "reason": reason,
            "changed_fields": changed_fields,
            "signer_name": payload.signer_name,
            "signer_title": payload.signer_title,
            "signature_type": payload.signature_type,
        },
        request=request,
    )
    await db.commit()

    signature = await get_current_signature(db)
    message = (
        f"Signature configured by {changed_by_name}."
        if action == "configured"
        else f"Signature updated to version {new_version} by {changed_by_name}."
    )
    return {"ok": True, "action": action, "signature": signature, "message": message}
