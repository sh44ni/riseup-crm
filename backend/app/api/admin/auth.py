from app.core.logger import get_logger
import os
import uuid
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, hash_scrypt_password, generate_session_token
from app.core.audit import record_audit_log
from app.core.redis import invalidate_session_cache, cache_get, cache_set, cache_delete
from app.core.permissions import get_user_effective_permissions
from app.core.invite_verification import invite_verified_key, INVITE_VERIFIED_TTL
from app.middlewares.auth import (
    get_optional_current_user, require_auth, invalidate_session
)
from app.middlewares.rate_limit import rate_limit
from app.schemas.auth import (
    LoginRequest, LoginResponse, UserProfileResponse,
    SessionListResponse, SessionActionResponse,
    VerifyOtpRequest, ResendOtpRequest
)
from app.services.email_service import send_otp_verification_email
logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin Auth"])

from app.core.audit import record_audit_log, get_client_ip, get_user_agent
from app.core.csrf import generate_csrf_token, extract_session_cookie
from app.core.permissions import AuthUser

@router.get("/auth")
@router.get("/auth/me")
async def check_auth_session(request: Request, response: Response, user = Depends(get_optional_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_token = getattr(request.state, "session_token", None) or extract_session_cookie(request)
    csrf_val = generate_csrf_token(session_token) if session_token else ""

    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"

    if csrf_val:
        is_secure = request.url.scheme == "https" or settings.ENVIRONMENT == "production"
        response.set_cookie(
            key=settings.CSRF_COOKIE_NAME,
            value=csrf_val,
            max_age=settings.SESSION_HOURS * 3600,
            httponly=False,
            secure=is_secure,
            samesite="lax",
            path="/"
        )

    return {
        "authenticated": True,
        "ok": True,
        "user": user.to_dict(),
        "csrf_token": csrf_val
    }

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
        clean_email = email.strip().lower()
        # Check if email has a pending invitation (first-time onboarding)
        invite_row = (await db.execute(text("""
            SELECT token FROM invitations
            WHERE LOWER(email) = LOWER(:email)
            AND status = 'pending'
            AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """), {"email": clean_email})).mappings().first()

        if invite_row:
            # First-time setup / invited user: generate secure 6-digit numeric OTP,
            # store in Redis with 10-minute TTL, send verification email, and prompt user
            otp = f"{secrets.randbelow(900_000) + 100_000}"
            otp_data = {
                "otp": otp,
                "token": invite_row["token"],
                "email": clean_email,
                "attempts": 0,
            }
            await cache_set(f"otp:invite:{clean_email}", json.dumps(otp_data), ttl_seconds=600)

            # Determine recipient name
            user_name = row["name"] if row and row.get("name") else ("Sylvester" if clean_email == "account@riseuprac.com" else "Team Member")
            try:
                await send_otp_verification_email(
                    to_email=clean_email,
                    otp=otp,
                    recipient_name=user_name,
                )
            except Exception as e:
                logger.error(f"Failed to send OTP verification email to {clean_email}: {e}")

            logger.info(f"===> [FIRST-TIME SIGN-IN OTP] 6-digit code for {clean_email}: {otp}")

            raise HTTPException(
                status_code=403,
                detail={
                    "code": "OTP_REQUIRED",
                    "message": f"A 6-digit verification code has been sent to {clean_email}. Please enter it to verify your identity.",
                    "email": clean_email,
                }
            )

        raise HTTPException(status_code=401, detail="You are not authorized to access this system.")

    # Create session token with duration based on remember_me
    remember_me = bool(getattr(payload, "remember_me", True))
    session_hours = (30 * 24) if remember_me else settings.SESSION_HOURS
    expires_at = datetime.now() + timedelta(hours=session_hours)
    ip_addr = get_client_ip(request)
    ua = get_user_agent(request)
    token = generate_session_token()

    await db.execute(text("""
        INSERT INTO admin_sessions (token, user_id, expires_at, created_at, ip_address, user_agent, last_seen_at)
        VALUES (:token, :uid, :exp, NOW(), :ip, :ua, NOW())
        ON CONFLICT (token) DO UPDATE SET 
            user_id = EXCLUDED.user_id, 
            expires_at = EXCLUDED.expires_at,
            ip_address = EXCLUDED.ip_address,
            user_agent = EXCLUDED.user_agent,
            last_seen_at = NOW()
    """), {
        "token": token,
        "uid": authenticated_user["id"],
        "exp": expires_at,
        "ip": ip_addr,
        "ua": ua
    })

    # Update last login timestamp
    await db.execute(text("UPDATE users SET last_login_at = NOW() WHERE id = :id"), {"id": authenticated_user["id"]})
    await db.commit()

    # Set httpOnly session cookie
    is_secure = request.url.scheme == "https" or settings.ENVIRONMENT == "production"
    cookie_max_age = (session_hours * 3600) if remember_me else None
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=cookie_max_age,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        path="/"
    )
    if is_secure and not settings.is_dev_like:
        response.set_cookie(
            key="__Host-session",
            value=token,
            max_age=cookie_max_age,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/"
        )

    # Set readable double-submit CSRF cookie
    csrf_val = generate_csrf_token(token)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_val,
        max_age=cookie_max_age,
        httponly=False,
        secure=is_secure,
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
            request=request,
            actor_type="user",
            actor_id=str(authenticated_user["id"])
        )
        await db.commit()
    except Exception as e:
        logger.error(f"{e}")

    # Resolve dynamic permissions
    perms, is_protected = await get_user_effective_permissions(db, authenticated_user["id"])
    if authenticated_user["role"] == "owner":
        is_protected = True
        perms["*"] = "all"

    # Check authorized signatory status
    sig_check = (await db.execute(text("""
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = :uid AND r.is_authorized_signatory = true
        LIMIT 1
    """), {"uid": authenticated_user["id"]})).scalar()
    is_auth_sig = bool(sig_check or (authenticated_user["role"] == "owner") or is_protected)

    # Prime Redis session cache for instantaneous subsequent checks
    try:
        import orjson
        from app.middlewares.auth import SESSION_CACHE_TTL
        redis_key = f"session_user:{token}"
        user_cache_payload = {
            "id": authenticated_user["id"],
            "name": authenticated_user["name"],
            "email": authenticated_user["email"],
            "role": authenticated_user["role"],
            "status": authenticated_user["status"],
            "phone": authenticated_user.get("phone"),
            "avatar_url": authenticated_user.get("avatar_url"),
            "permissions": perms,
            "is_protected_owner": is_protected,
            "is_authorized_signatory": is_auth_sig,
            "kind": "user",
            "user_id": authenticated_user["id"],
        }
        await cache_set(redis_key, orjson.dumps(user_cache_payload).decode("utf-8"), ttl_seconds=SESSION_CACHE_TTL)
    except Exception as e:
        logger.warning(f"Could not prime Redis session cache: {e}")

    return {
        "ok": True,
        "token": token,
        "csrf_token": csrf_val,
        "user": {
            "id": authenticated_user["id"],
            "name": authenticated_user["name"],
            "email": authenticated_user["email"],
            "role": authenticated_user["role"],
            "phone": authenticated_user.get("phone"),
            "avatar_url": authenticated_user.get("avatar_url"),
            "permissions": perms,
            "is_protected_owner": is_protected,
            "is_authorized_signatory": is_auth_sig,
            "kind": "user",
            "user_id": authenticated_user["id"],
        }
    }


@router.post("/auth/verify-otp", dependencies=[Depends(rate_limit("invite-otp-verify", 20, 600))])
async def verify_otp(
    payload: VerifyOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    clean_email = payload.email.strip().lower()
    submitted_otp = payload.otp.strip()

    cached_str = await cache_get(f"otp:invite:{clean_email}")
    if not cached_str:
        # Check if active invite still exists
        invite_row = (await db.execute(text("""
            SELECT token FROM invitations
            WHERE LOWER(email) = LOWER(:email)
            AND status = 'pending'
            AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """), {"email": clean_email})).mappings().first()
        if not invite_row:
            raise HTTPException(status_code=400, detail="No active invitation found for this email address.")
        raise HTTPException(
            status_code=400,
            detail="The verification code has expired. Please sign in again to receive a fresh code."
        )

    try:
        data = json.loads(cached_str)
    except Exception:
        await cache_delete(f"otp:invite:{clean_email}")
        raise HTTPException(status_code=400, detail="Corrupted verification session. Please sign in again.")

    if str(data.get("otp", "")).strip() != submitted_otp:
        attempts = int(data.get("attempts", 0)) + 1
        if attempts >= 5:
            await cache_delete(f"otp:invite:{clean_email}")
            raise HTTPException(status_code=400, detail="Too many invalid code attempts. Please sign in again to receive a new code.")
        data["attempts"] = attempts
        await cache_set(f"otp:invite:{clean_email}", json.dumps(data), ttl_seconds=600)
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email and try again.")

    # Valid OTP verified! Invalidate the OTP and return the invite token
    token = data["token"]
    await cache_delete(f"otp:invite:{clean_email}")
    # Unlock the invitation for account setup. /public/invitations/{token}/accept refuses
    # any token that hasn't been unlocked by proving ownership of the invited inbox.
    await cache_set(invite_verified_key(token), clean_email, ttl_seconds=INVITE_VERIFIED_TTL)

    return {
        "ok": True,
        "message": "Identity verified successfully.",
        "token": token,
        "email": clean_email,
    }


@router.post("/auth/resend-otp", dependencies=[Depends(rate_limit("invite-otp-send", 8, 600))])
async def resend_otp(
    payload: ResendOtpRequest,
    db: AsyncSession = Depends(get_db),
):
    clean_email = payload.email.strip().lower()
    invite_row = (await db.execute(text("""
        SELECT token FROM invitations
        WHERE LOWER(email) = LOWER(:email)
        AND status = 'pending'
        AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
    """), {"email": clean_email})).mappings().first()

    if not invite_row:
        raise HTTPException(status_code=400, detail="No pending invitation found for this email address.")

    user_row = (await db.execute(text("SELECT name FROM users WHERE LOWER(email) = LOWER(:email)"), {"email": clean_email})).mappings().first()
    user_name = user_row["name"] if user_row and user_row.get("name") else ("Sylvester" if clean_email == "account@riseuprac.com" else "Team Member")

    otp = f"{secrets.randbelow(900_000) + 100_000}"
    otp_data = {
        "otp": otp,
        "token": invite_row["token"],
        "email": clean_email,
        "attempts": 0,
    }
    await cache_set(f"otp:invite:{clean_email}", json.dumps(otp_data), ttl_seconds=600)

    try:
        await send_otp_verification_email(
            to_email=clean_email,
            otp=otp,
            recipient_name=user_name,
        )
    except Exception as e:
        logger.error(f"Failed to resend OTP verification email to {clean_email}: {e}")

    logger.info(f"===> [RESENT FIRST-TIME SIGN-IN OTP] Code for {clean_email}: {otp}")

    return {
        "ok": True,
        "message": f"A new 6-digit verification code has been sent to {clean_email}.",
        "email": clean_email,
    }

@router.delete("/auth", response_model=SessionActionResponse)
@router.post("/auth/logout", response_model=SessionActionResponse)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = extract_session_cookie(request)
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_val = auth_header.split(" ", 1)[1].strip()
            if not bearer_val.startswith("rup_"):
                token = bearer_val

    if token:
        await invalidate_session(token, db)

    for c_name in ("__Host-session", settings.COOKIE_NAME, "session", settings.CSRF_COOKIE_NAME):
        response.delete_cookie(c_name, path="/")
    return {"ok": True}

@router.get("/auth/sessions", response_model=SessionListResponse)
async def list_user_sessions(
    request: Request,
    user: AuthUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    if user.is_api_key:
        raise HTTPException(status_code=400, detail="API keys do not have interactive sessions.")

    current_token = getattr(request.state, "session_token", None) or extract_session_cookie(request)
    stmt = text("""
        SELECT id, token, created_at, expires_at, last_seen_at, ip_address, user_agent
        FROM admin_sessions
        WHERE user_id = :uid AND expires_at > NOW()
        ORDER BY last_seen_at DESC, created_at DESC
    """)
    res = await db.execute(stmt, {"uid": user.id})
    sessions = []
    for row in res.fetchall():
        s_id = row[0]
        s_token = row[1]
        is_cur = bool(current_token and s_token == current_token)
        sessions.append({
            "id": s_id,
            "ip_address": row[5] or "Unknown IP",
            "user_agent": row[6] or "Unknown Device",
            "last_seen_at": row[4].isoformat() if row[4] else None,
            "created_at": row[2].isoformat() if row[2] else None,
            "is_current": is_cur,
        })
    return {"ok": True, "sessions": sessions}

@router.delete("/auth/sessions/{session_id}", response_model=SessionActionResponse)
async def revoke_session(
    session_id: int,
    request: Request,
    user: AuthUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    if user.is_api_key:
        raise HTTPException(status_code=400, detail="API keys cannot manage sessions.")

    res = await db.execute(
        text("SELECT token, user_id FROM admin_sessions WHERE id = :id"),
        {"id": session_id}
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found.")

    if row[1] != user.id and not (user.role == "owner" or user.is_protected_owner):
        raise HTTPException(status_code=403, detail="Cannot revoke another user's session.")

    session_token = row[0]
    await invalidate_session(session_token, db)
    return {"ok": True, "message": "Session revoked."}

@router.delete("/auth/sessions", response_model=SessionActionResponse)
async def revoke_other_sessions(
    request: Request,
    user: AuthUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    if user.is_api_key:
        raise HTTPException(status_code=400, detail="API keys cannot manage sessions.")

    current_token = getattr(request.state, "session_token", None) or extract_session_cookie(request)
    query = text("""
        SELECT token FROM admin_sessions 
        WHERE user_id = :uid AND (:cur_token IS NULL OR token != :cur_token)
    """)
    res = await db.execute(query, {"uid": user.id, "cur_token": current_token})
    tokens = [r[0] for r in res.fetchall()]
    for t in tokens:
        await invalidate_session(t, db)

    return {"ok": True, "revoked_count": len(tokens), "message": f"Revoked {len(tokens)} other sessions."}


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
    user_dict["is_authorized_signatory"] = bool(row.get("is_authorized_signatory") or row["role"] == "owner" or is_protected)
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
