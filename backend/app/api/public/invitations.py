from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_scrypt_password, generate_session_token
from app.core.permissions import get_user_effective_permissions
from app.core.redis import invalidate_session_cache
from app.core.audit import record_audit_log

router = APIRouter(prefix="/api/public/invitations", tags=["Public Invitations"])

@router.get("/{token}")
async def get_invitation_details(token: str, db: AsyncSession = Depends(get_db)):
    clean_token = token.strip()
    sql = text("""
        SELECT i.id, i.email, i.invited_role_ids, i.status, i.expires_at, i.created_at,
               u.name as invited_by_name
        FROM invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        WHERE i.token = :token
    """)
    inv = (await db.execute(sql, {"token": clean_token})).mappings().first()
    if not inv:
        raise HTTPException(
            status_code=404,
            detail="This invite link is invalid, has already been used, or has expired."
        )

    if inv["status"] == "revoked":
        raise HTTPException(status_code=400, detail="This invitation has been revoked by an administrator.")

    now = datetime.now(inv["expires_at"].tzinfo) if inv["expires_at"].tzinfo else datetime.now()
    if inv["expires_at"] < now:
        raise HTTPException(status_code=400, detail="This invitation has expired. Please ask for a new invite.")

    # Fetch assigned roles details
    roles = []
    if inv["invited_role_ids"]:
        role_rows = (await db.execute(text("""
            SELECT id, name, description FROM roles WHERE id = ANY(:rids)
        """), {"rids": inv["invited_role_ids"]})).mappings().all()
        roles = [dict(r) for r in role_rows]

    # Prepopulate user's name and phone if already on record
    user_row = (await db.execute(text("SELECT name, phone FROM users WHERE LOWER(email) = LOWER(:email)"), {"email": inv["email"]})).mappings().first()

    return {
        "ok": True,
        "invitation": {
            "email": inv["email"],
            "name": user_row["name"] if user_row and user_row.get("name") else None,
            "phone": user_row["phone"] if user_row and user_row.get("phone") else None,
            "invited_by": inv["invited_by_name"] or "Rise Up Roofing Team",
            "roles": roles,
            "primary_role": roles[0]["name"] if roles else "Team Member",
            "expires_at": inv["expires_at"].isoformat(),
        }
    }

@router.post("/{token}/accept")
async def accept_invitation(
    token: str,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    clean_token = token.strip()
    body = await request.json()
    name = (body.get("name") or "").strip()
    password = body.get("password") or ""
    phone = (body.get("phone") or "").strip() or None
    avatar_url = (body.get("avatar_url") or "").strip() or None

    if not name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    sql = text("""
        SELECT i.id, i.email, i.invited_role_ids, i.status, i.expires_at
        FROM invitations i
        WHERE i.token = :token
    """)
    inv = (await db.execute(sql, {"token": clean_token})).mappings().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation link not found.")

    if inv["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation is {inv['status']}.")

    now = datetime.now(inv["expires_at"].tzinfo) if inv["expires_at"].tzinfo else datetime.now()
    if inv["expires_at"] < now:
        raise HTTPException(status_code=400, detail="This invitation has expired.")

    p_hash, salt = hash_scrypt_password(password)
    email = inv["email"].strip().lower()

    # Determine primary role slug from invited_role_ids
    primary_role_slug = "sales_rep"
    primary_role_id = None
    if inv["invited_role_ids"]:
        primary_role_id = inv["invited_role_ids"][0]
        r_name = (await db.execute(text("SELECT name FROM roles WHERE id = :id"), {"id": primary_role_id})).scalar()
        if r_name:
            primary_role_slug = r_name.lower().replace(" ", "_")

    # Check if user already exists
    user_row = (await db.execute(text("SELECT id, status, password_hash FROM users WHERE LOWER(email) = :e"), {"e": email})).mappings().first()
    if user_row:
        if user_row["status"] == "active" and user_row.get("password_hash"):
            raise HTTPException(status_code=400, detail="An account with this email is already active. Please sign in.")
        user_id = user_row["id"]
        await db.execute(text("""
            UPDATE users
            SET name = :name, phone = COALESCE(:phone, phone), avatar_url = COALESCE(:avatar_url, avatar_url), password_hash = :phash,
                salt = :salt, role = :role, status = 'active', updated_at = NOW()
            WHERE id = :id
        """), {"name": name, "phone": phone, "avatar_url": avatar_url, "phash": p_hash, "salt": salt, "role": primary_role_slug, "id": user_id})
    else:
        new_u = (await db.execute(text("""
            INSERT INTO users (name, email, phone, avatar_url, role, password_hash, salt, status, created_at, updated_at)
            VALUES (:name, :email, :phone, :avatar_url, :role, :phash, :salt, 'active', NOW(), NOW())
            RETURNING id
        """), {
            "name": name, "email": email, "phone": phone, "avatar_url": avatar_url, "role": primary_role_slug,
            "phash": p_hash, "salt": salt
        })).mappings().first()
        user_id = new_u["id"]

    # Assign roles in user_roles
    await db.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": user_id})
    if inv["invited_role_ids"]:
        for rid in inv["invited_role_ids"]:
            await db.execute(text("""
                INSERT INTO user_roles (user_id, role_id, assigned_at)
                VALUES (:uid, :rid, NOW())
                ON CONFLICT (user_id, role_id) DO NOTHING
            """), {"uid": user_id, "rid": rid})

    # Delete the invitation row — it's been redeemed, no need to keep it.
    # Also clean up any other pending invites for the same email (edge case from before dedup guard).
    await db.execute(text("""
        DELETE FROM invitations
        WHERE LOWER(email) = LOWER(:email)
    """), {"email": inv["email"]})

    # Create active admin session
    session_token = generate_session_token()
    session_exp = datetime.now() + timedelta(hours=settings.SESSION_HOURS)
    await db.execute(text("""
        INSERT INTO admin_sessions (token, user_id, expires_at, created_at)
        VALUES (:token, :uid, :exp, NOW())
        ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
    """), {"token": session_token, "uid": user_id, "exp": session_exp})

    # Update last login
    await db.execute(text("UPDATE users SET last_login_at = NOW() WHERE id = :id"), {"id": user_id})

    await db.commit()
    await invalidate_session_cache()

    # Set httpOnly cookie
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=session_token,
        max_age=settings.SESSION_HOURS * 3600,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/"
    )

    # Resolve dynamic permissions
    perms, is_protected = await get_user_effective_permissions(db, user_id)
    if primary_role_slug == "owner":
        is_protected = True
        perms["*"] = "all"

    # Check authorized signatory status
    sig_check = (await db.execute(text("""
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = :uid AND r.is_authorized_signatory = true
        LIMIT 1
    """), {"uid": user_id})).scalar()
    is_auth_sig = bool(sig_check or primary_role_slug == "owner" or is_protected)

    return {
        "ok": True,
        "token": session_token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": primary_role_slug,
            "phone": phone,
            "permissions": perms,
            "is_protected_owner": is_protected,
            "is_authorized_signatory": is_auth_sig,
        }
    }
