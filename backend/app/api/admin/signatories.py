"""
Authorized Signatories Administration Routes
============================================
Manages designated contract signatories and their official electronic signatures.
Enforces strict personal ownership: only the signatory themselves can set, view, or manage their signature.
"""

from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.api.admin.rbac import require_auth, require_permission

router = APIRouter(prefix="/api/admin/signatories", tags=["Authorized Signatories"])


class UpdateSignatorySignatureRequest(BaseModel):
    signature_name: Optional[str] = Field(None, max_length=150)
    signature_title: Optional[str] = Field("Project Manager", max_length=100)
    signature_type: str = Field("typed", pattern="^(typed|drawn)$")
    signature_data: str = Field(..., min_length=1)


@router.get("")
async def list_authorized_signatories(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """
    Returns all active users who are assigned to at least one role with
    `is_authorized_signatory = true`.
    
    SECURITY: The raw `signature_data` (ink/calligraphy) is returned ONLY to the
    signatory themselves (is_self=True). For all other users (even admins and owners),
    `signature_data` is masked to null to protect signature privacy and prevent copying.
    """
    sql = text("""
        SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
               u.signature_data, u.signature_type, u.signature_title,
               u.updated_at,
               COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
        FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id AND r.is_authorized_signatory = true
        WHERE u.status = 'active'
        GROUP BY u.id
        ORDER BY u.name ASC
    """)
    rows = (await db.execute(sql)).mappings().all()

    signatories = []
    for r in rows:
        d = dict(r)
        roles_list = d.get("roles") or []
        has_sig = bool(d.get("signature_data") and d.get("signature_data").strip())
        is_self = (current_user.id == d["id"])
        
        signatories.append({
            "id": d["id"],
            "name": d["name"],
            "email": d["email"],
            "phone": d.get("phone"),
            "avatar_url": d.get("avatar_url"),
            "role_names": [rl["name"] for rl in roles_list],
            "signature_title": d.get("signature_title") or "Project Manager",
            "signature_type": d.get("signature_type") or "typed",
            # Strict Privacy: ONLY the signatory themselves can access their own signature ink/data
            "signature_data": d.get("signature_data") if is_self else None,
            "has_signature": has_sig,
            "is_self": is_self,
            "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None,
        })

    configured_count = sum(1 for s in signatories if s["has_signature"])

    return {
        "signatories": signatories,
        "total": len(signatories),
        "configured_count": configured_count,
    }


@router.put("/{user_id}/signature")
async def update_signatory_signature(
    user_id: int,
    payload: UpdateSignatorySignatureRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """
    Sets or updates the official signature, calligraphy type, and title for a designated signatory.
    
    SECURITY ENFORCEMENT:
    1. Users can ONLY configure their OWN signature (`current_user.id == user_id`).
       No other account (not even the company owner or admins) can set or edit someone else's signature.
    2. The user MUST hold an active role with `is_authorized_signatory = true`.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only configure your own personal electronic signature. Other accounts cannot set signatures on your behalf."
        )

    # Verify that the current user actually holds an authorized signatory role
    sig_check = await db.execute(
        text("""
            SELECT 1
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            INNER JOIN roles r ON ur.role_id = r.id AND r.is_authorized_signatory = true
            WHERE u.id = :uid AND u.status = 'active'
            LIMIT 1
        """),
        {"uid": current_user.id}
    )
    if not sig_check.first():
        raise HTTPException(
            status_code=403,
            detail="You do not hold an Authorized Signatory role. A role with the signatory permission must be assigned before configuring a contract signature."
        )

    # Update user signature fields
    update_sql = text("""
        UPDATE users
        SET signature_data = :sig_data,
            signature_type = :sig_type,
            signature_title = :sig_title,
            name = COALESCE(:sig_name, name),
            updated_at = NOW()
        WHERE id = :uid
        RETURNING id, name, email, phone, signature_data, signature_type, signature_title, updated_at
    """)
    updated = (await db.execute(update_sql, {
        "sig_data": payload.signature_data.strip(),
        "sig_type": payload.signature_type,
        "sig_title": (payload.signature_title or "Project Manager").strip(),
        "sig_name": payload.signature_name.strip() if payload.signature_name else None,
        "uid": current_user.id,
    })).mappings().first()

    await db.commit()

    return {
        "ok": True,
        "message": "Your authorized signature was saved successfully.",
        "signatory": dict(updated),
    }


@router.delete("/{user_id}/signature")
async def delete_signatory_signature(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_auth),
):
    """
    Clears the stored signature for a signatory.
    SECURITY: Only the signatory themselves can delete their signature.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: You can only manage your own electronic signature."
        )

    await db.execute(
        text("""
            UPDATE users
            SET signature_data = NULL,
                signature_type = 'typed',
                updated_at = NOW()
            WHERE id = :uid
        """),
        {"uid": current_user.id}
    )
    await db.commit()

    return {
        "ok": True,
        "message": "Your signature has been removed."
    }
