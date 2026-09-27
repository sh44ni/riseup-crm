from app.core.logger import get_logger
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, hash_scrypt_password, generate_session_token
from app.core.audit import record_audit_log
from app.core.redis import invalidate_session_cache
from app.core.permissions import get_user_effective_permissions
from app.middlewares.auth import (
    get_optional_current_user, require_auth, invalidate_session
)
from app.middlewares.rate_limit import rate_limit
from app.schemas.auth import LoginRequest, LoginResponse, UserProfileResponse
logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])

@router.get("/auth")
@router.get("/auth/me")
async def check_auth_session(user = Depends(get_optional_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"authenticated": True, "ok": True, "user": user.to_dict()}

@router.post("/auth", dependencies=[Depends(rate_limit("admin-login", 20, 300))])
@router.post("/auth/login", dependencies=[Depends(rate_limit("admin-login", 20, 300))])
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = payload.email
    password = payload.password

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    if not email or not isinstance(email, str):
        raise HTTPException(status_code=400, detail="Email is required")

    authenticated_user = None

    # Standard user credentials check
    sql = text("""
        SELECT id, name, email, phone, role, status, avatar_url, password_hash, salt
        FROM users
        WHERE LOWER(email) = LOWER(:email)
    """)
    row = (await db.execute(sql, {"email": email.strip()})).mappings().first()
    if row and row["status"] == "active":
        if verify_password(password, row["password_hash"], row["salt"]):
            authenticated_user = dict(row)

    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")

    # Create session token
    token = generate_session_token()
    expires_at = datetime.now() + timedelta(hours=settings.SESSION_HOURS)

    await db.execute(text("""
        INSERT INTO admin_sessions (token, user_id, expires_at, created_at)
        VALUES (:token, :uid, :exp, NOW())
        ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
    """), {"token": token, "uid": authenticated_user["id"], "exp": expires_at})

    # Update last login timestamp
    await db.execute(text("UPDATE users SET last_login_at = NOW() WHERE id = :id"), {"id": authenticated_user["id"]})
    await db.commit()

    # Set httpOnly cookie
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.SESSION_HOURS * 3600,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/"
    )

    # Record login audit log
    try:
        await record_audit_log(
            db=db,
            action="auth.login",
            resource_type="user",
            resource_id=authenticated_user["id"],
            user_id=authenticated_user["id"],
            user_email=authenticated_user["email"],
            user_role=authenticated_user["role"],
            request=request
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    # Resolve dynamic permissions
    perms, is_protected = await get_user_effective_permissions(db, authenticated_user["id"])
    if authenticated_user["role"] == "owner":
        is_protected = True
        perms["*"] = "all"

    return {
        "ok": True,
        "token": token,
        "user": {
            "id": authenticated_user["id"],
            "name": authenticated_user["name"],
            "email": authenticated_user["email"],
            "role": authenticated_user["role"],
            "phone": authenticated_user.get("phone"),
            "avatar_url": authenticated_user.get("avatar_url"),
            "permissions": perms,
            "is_protected_owner": is_protected,
        }
    }

@router.delete("/auth")
@router.post("/auth/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        await invalidate_session(token, db)

    response.delete_cookie(settings.COOKIE_NAME, path="/")
    return {"ok": True}

@router.get("/profile")
async def get_current_profile(db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    sql = text("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar_url,
               u.last_login_at, u.created_at, u.permissions,
               u.signature_data, u.signature_type, u.signature_title,
               COALESCE(bool_or(r.is_authorized_signatory), false) as is_authorized_signatory
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id AND r.is_authorized_signatory = true
        WHERE u.id = :id
        GROUP BY u.id
    """)
    row = (await db.execute(sql, {"id": user.id})).mappings().first()
    if not row:
        return {"ok": True, "user": user.to_dict()}
    
    perms, is_protected = await get_user_effective_permissions(db, user.id)
    if row["role"] == "owner":
        is_protected = True
        perms["*"] = "all"
        
    user_dict = dict(row)
    user_dict["permissions"] = perms
    user_dict["is_protected_owner"] = is_protected
    user_dict["has_signature"] = bool(row.get("signature_data") and str(row.get("signature_data")).strip())
    user_dict["is_authorized_signatory"] = bool(row.get("is_authorized_signatory"))
    if user_dict.get("created_at"):
        user_dict["created_at"] = user_dict["created_at"].isoformat()
    if user_dict.get("last_login_at"):
        user_dict["last_login_at"] = user_dict["last_login_at"].isoformat()
    return {"ok": True, "user": user_dict}

@router.patch("/profile")
@router.put("/profile")
async def update_current_profile(request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = await request.json()
    updates = []
    params = {"id": user.id}

    if "name" in body and body["name"]:
        updates.append("name = :name")
        params["name"] = str(body["name"]).strip()
    if "phone" in body:
        updates.append("phone = :phone")
        params["phone"] = str(body["phone"]).strip() if body["phone"] else None
    if "avatar_url" in body:
        updates.append("avatar_url = :avatar_url")
        params["avatar_url"] = str(body["avatar_url"]).strip() if body["avatar_url"] else None

    if not updates:
        return {"ok": True, "message": "No changes requested", "user": user.to_dict()}

    sql = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE id = :id RETURNING id, name, email, phone, role, status, avatar_url, last_login_at, created_at"
    row = (await db.execute(text(sql), params)).mappings().first()
    await db.commit()
    await invalidate_session_cache()

    try:
        await record_audit_log(
            db=db,
            action="user.profile_update",
            resource_type="user",
            resource_id=user.id,
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            meta={"updates": list(params.keys())},
            request=request
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    perms, is_protected = await get_user_effective_permissions(db, user.id)
    if row["role"] == "owner":
        is_protected = True
        perms["*"] = "all"

    user_dict = dict(row)
    user_dict["permissions"] = perms
    user_dict["is_protected_owner"] = is_protected
    if user_dict.get("created_at"):
        user_dict["created_at"] = user_dict["created_at"].isoformat()
    if user_dict.get("last_login_at"):
        user_dict["last_login_at"] = user_dict["last_login_at"].isoformat()

    return {"ok": True, "message": "Profile updated successfully", "user": user_dict}

@router.post("/profile/password")
async def update_current_password(request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = await request.json()
    current_password = body.get("current_password") or body.get("currentPassword")
    new_password = body.get("new_password") or body.get("newPassword")

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are both required.")

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    # Fetch user password credentials
    sql = text("SELECT id, password_hash, salt, role FROM users WHERE id = :id")
    row = (await db.execute(sql, {"id": user.id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password (supports standard hash or owner master password override)
    is_valid = False
    if verify_password(current_password, row["password_hash"], row["salt"]):
        is_valid = True
    elif (row["role"] == "owner" or user.is_protected_owner) and settings.ADMIN_PASSWORD and current_password == settings.ADMIN_PASSWORD:
        is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Incorrect current password. Please try again.")

    # Hash new password
    p_hash, salt = hash_scrypt_password(new_password)

    await db.execute(text("""
        UPDATE users
        SET password_hash = :p_hash, salt = :salt, updated_at = NOW()
        WHERE id = :id
    """), {"p_hash": p_hash, "salt": salt, "id": user.id})
    await db.commit()
    await invalidate_session_cache()

    try:
        await record_audit_log(
            db=db,
            action="user.password_change",
            resource_type="user",
            resource_id=user.id,
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            request=request
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    return {"ok": True, "message": "Password changed successfully"}

@router.post("/profile/avatar")
async def upload_current_avatar(
    request: Request,
    file: Optional[UploadFile] = File(None),
    avatar_url: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user = Depends(require_auth)
):
    final_avatar_url = None

    if file:
        # Validate MIME type / extension
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if file.content_type and file.content_type.lower() not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid image type. Only JPEG, PNG, WEBP, and GIF are allowed.")

        ext = "jpg"
        if file.filename and "." in file.filename:
            ext = file.filename.rsplit(".", 1)[1].lower()
            if ext not in ["jpg", "jpeg", "png", "webp", "gif"]:
                ext = "jpg"

        # Determine uploads dir
        static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static"))
        avatars_dir = os.path.join(static_dir, "uploads", "avatars")
        os.makedirs(avatars_dir, exist_ok=True)

        filename = f"avatar_{user.id}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
        filepath = os.path.join(avatars_dir, filename)

        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file exceeds maximum allowed size (5MB).")

        with open(filepath, "wb") as f:
            f.write(contents)

        final_avatar_url = f"/static/uploads/avatars/{filename}"
    elif avatar_url:
        final_avatar_url = avatar_url.strip()
    else:
        # Check if json body sent
        try:
            body = await request.json()
            if body.get("avatar_url"):
                final_avatar_url = body.get("avatar_url").strip()
        except Exception:
            pass

    if not final_avatar_url:
        raise HTTPException(status_code=400, detail="No avatar file or URL provided.")

    await db.execute(text("UPDATE users SET avatar_url = :url, updated_at = NOW() WHERE id = :id"), {
        "url": final_avatar_url,
        "id": user.id
    })
    await db.commit()
    await invalidate_session_cache()

    try:
        await record_audit_log(
            db=db,
            action="user.avatar_update",
            resource_type="user",
            resource_id=user.id,
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            meta={"avatar_url": final_avatar_url},
            request=request
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    return {"ok": True, "avatar_url": final_avatar_url, "message": "Avatar updated successfully"}

@router.delete("/profile/avatar")
async def remove_current_avatar(request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    await db.execute(text("UPDATE users SET avatar_url = NULL, updated_at = NOW() WHERE id = :id"), {
        "id": user.id
    })
    await db.commit()
    await invalidate_session_cache()

    try:
        await record_audit_log(
            db=db,
            action="user.avatar_remove",
            resource_type="user",
            resource_id=user.id,
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            request=request
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    return {"ok": True, "avatar_url": None, "message": "Avatar removed successfully"}
