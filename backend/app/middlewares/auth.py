import hashlib
import time
from datetime import datetime, timezone
from typing import Optional, List, Callable
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import orjson

from app.core.config import settings
from app.core.actor_context import actor_from_user, bind_actor_to_session, set_actor
from app.core.audit import get_client_ip
from app.core.database import get_db
from app.core.redis import cache_get, cache_set, cache_delete, check_rate_limit, get_redis, is_redis_available
from app.core.permissions import AuthUser, has_permission, has_any_permission, get_user_effective_permissions

SESSION_CACHE_TTL = 120  # 2 minutes cache in Redis for rapid subsequent checks

async def resolve_auth_user(token: str, db: AsyncSession) -> Optional[AuthUser]:
    if not token or len(token) != 64:
        return None

    redis_key = f"session_user:{token}"
    # 1. Check Redis cache first (sub-millisecond)
    cached = await cache_get(redis_key)
    if cached:
        try:
            data = orjson.loads(cached)
            return AuthUser(**data)
        except Exception:
            pass

    # 2. Query PostgreSQL database
    stmt = text("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar_url
        FROM admin_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = :token AND s.expires_at > NOW() AND u.status = 'active'
    """)

    result = await db.execute(stmt, {"token": token})
    row = result.mappings().first()
    if not row:
        return None

    # Resolve effective permissions
    perms, is_protected_owner = await get_user_effective_permissions(db, row["id"])
    if row["role"] == "owner":
        is_protected_owner = True
        perms["*"] = "all"

    auth_user = AuthUser(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=row["role"],
        status=row["status"],
        phone=row.get("phone"),
        avatar_url=row.get("avatar_url"),
        permissions=perms,
        is_protected_owner=is_protected_owner,
    )

    # Cache user object in Redis
    user_dict = auth_user.to_dict()
    user_dict["is_protected_owner"] = is_protected_owner
    await cache_set(redis_key, orjson.dumps(user_dict).decode("utf-8"), ttl_seconds=SESSION_CACHE_TTL)
    return auth_user

async def verify_client_key(api_key: str, db: AsyncSession, request: Request) -> Optional[dict]:
    """
    Verify and validate a dynamic client/application API Key in < 0.1ms using Redis cache.
    Applies per-key sliding-window rate limiting and scope/origin checks.
    Returns key metadata for client application verification.
    """
    if not api_key:
        return None

    clean_key = api_key.strip()
    key_hash = hashlib.sha256(clean_key.encode("utf-8")).hexdigest()
    redis_key = f"apikey:{key_hash}"

    key_data = None
    cached = await cache_get(redis_key)
    if cached:
        try:
            key_data = orjson.loads(cached)
            if not key_data.get("is_active", True):
                await cache_delete(redis_key)
                return None
        except Exception:
            key_data = None

    if not key_data:
        stmt = text("""
            SELECT id, name, key_prefix, environment, scopes, rate_limit_per_minute, allowed_origins, is_active, expires_at
            FROM api_keys
            WHERE key_hash = :key_hash
        """)
        res = await db.execute(stmt, {"key_hash": key_hash})
        row = res.mappings().first()
        if not row:
            return None

        # Check active status
        if not row["is_active"]:
            return None

        # Check expiration if set
        if row["expires_at"] and row["expires_at"] < datetime.now(timezone.utc):
            return None

        key_data = {
            "id": row["id"],
            "name": row["name"],
            "key_prefix": row["key_prefix"],
            "environment": row["environment"],
            "scopes": row["scopes"] or [],
            "rate_limit_per_minute": row["rate_limit_per_minute"] or 120,
            "allowed_origins": row["allowed_origins"] or [],
            "is_active": bool(row["is_active"]),
        }
        await cache_set(redis_key, orjson.dumps(key_data).decode("utf-8"), ttl_seconds=30)

    # Check Rate Limit per API Key
    rl_key = f"rl:apikey:{key_data['id']}"
    limit = key_data["rate_limit_per_minute"]
    allowed, remaining, retry_after = await check_rate_limit(rl_key, limit, 60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"API key rate limit exceeded ({limit} req/min). Try again in {retry_after}s."
        )

    # Check Origin restriction if specified
    allowed_origins = key_data.get("allowed_origins", [])
    if allowed_origins and "*" not in allowed_origins:
        req_origin = request.headers.get("origin")
        if req_origin and req_origin not in allowed_origins:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Origin not allowed for this API key."
            )

    # Asynchronously update key hit counter in Redis (only if Redis is online)
    if await is_redis_available():
        try:
            redis_inst = get_redis()
            pipe = redis_inst.pipeline()
            pipe.incr(f"apikey:stats:{key_data['id']}:hits")
            pipe.set(f"apikey:stats:{key_data['id']}:last_used", int(time.time()))
            await pipe.execute()
        except Exception:
            pass

    return key_data


from app.core.csrf import check_csrf

async def _resolve_optional_user(request: Request, db: AsyncSession) -> Optional[AuthUser]:
    """
    Resolves the authenticated user according to the Phase 5 hierarchy:
    1. First priority: Session Cookie (__Host-session, settings.COOKIE_NAME, session)
    2. Zero-lockout fallback: Authorization: Bearer <session_token> (when LEGACY_BEARER_AUTH=True)
    3. Client API Key: X-API-Key or X-Client-Key or Bearer rup_... (service account)
    """
    # 1. Check for client API Key (X-API-Key or X-Client-Key) for app verification / service account
    api_key = request.headers.get("x-api-key") or request.headers.get("x-client-key")
    client_key_data = None
    if api_key:
        client_key_data = await verify_client_key(api_key, db, request)
        if client_key_data:
            request.state.client_app = client_key_data["name"]

    # 2. Check for Session Cookie
    token = (
        request.cookies.get("__Host-session")
        or request.cookies.get(settings.COOKIE_NAME)
        or request.cookies.get("session")
    )
    auth_method = "cookie" if token else None

    # 3. Check for Legacy Bearer Token (if enabled and no cookie provided)
    if not token and settings.LEGACY_BEARER_AUTH:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            bearer_val = auth_header.split(" ", 1)[1].strip()
            # If not an API key prefix, treat as session token
            if not (bearer_val.startswith("rup_") or (api_key and bearer_val == api_key)):
                token = bearer_val
                auth_method = "bearer"
            elif not client_key_data:
                # Bearer token is an API key (e.g. Bearer rup_live_...)
                client_key_data = await verify_client_key(bearer_val, db, request)

    # 4. If user session token is present, resolve the authenticated staff member
    if token:
        request.state.session_token = token
        request.state.auth_method = auth_method
        user = await resolve_auth_user(token, db)
        if user:
            return user

    # 5. If an API key was provided and verified, return an AuthUser scoped strictly to its permissions
    if client_key_data:
        request.state.auth_method = "api_key"
        key_scopes = client_key_data.get("scopes") or []
        perms_dict = {scope: "all" for scope in key_scopes}
        return AuthUser(
            id=client_key_data["id"],
            name=f"API Key: {client_key_data['name']}",
            email=f"api_{client_key_data['key_prefix']}@system.local",
            role="service_account",
            status="active",
            permissions=perms_dict,
            is_protected_owner=False,
            is_api_key=True,
            api_key_id=client_key_data["id"],
            kind="api_key",
        )

    return None


async def get_optional_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[AuthUser]:
    """Resolve the caller and bind them as the actor for the DB activity log triggers."""
    user = await _resolve_optional_user(request, db)
    if user:
        actor = actor_from_user(user, get_client_ip(request))
        set_actor(actor)
        await bind_actor_to_session(db, actor)
    return user

async def resolve_api_key(api_key: str, db: AsyncSession, request: Request) -> Optional[AuthUser]:
    """
    Verifies the API key and returns an AuthUser scoped strictly to its permissions.
    """
    key_data = await verify_client_key(api_key, db, request)
    if not key_data:
        return None

    key_scopes = key_data.get("scopes") or []
    perms_dict = {scope: "all" for scope in key_scopes}
    return AuthUser(
        id=key_data["id"],
        name=f"API Key: {key_data['name']}",
        email=f"api_{key_data['key_prefix']}@system.local",
        role="service_account",
        status="active",
        permissions=perms_dict,
        is_protected_owner=False,
        is_api_key=True,
        api_key_id=key_data["id"],
        kind="api_key",
    )

async def require_auth(
    request: Request,
    user: Optional[AuthUser] = Depends(get_optional_current_user)
) -> AuthUser:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized. Valid session or API key required."
        )

    # Validate CSRF for cookie-authenticated mutating requests
    if getattr(request.state, "auth_method", None) == "cookie":
        check_csrf(request)

    return user

# Alias for compatibility with routers expecting get_current_user
get_current_user = require_auth

def require_permission(permission: str, required_scope: Optional[str] = None) -> Callable:
    async def dependency(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if not has_permission(user, permission, required_scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Missing required permission or scope [{permission}]"
            )
        return user
    return dependency

def require_any_permission(permissions: List[str]) -> Callable:
    async def dependency(user: AuthUser = Depends(require_auth)) -> AuthUser:
        if not has_any_permission(user, permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Insufficient permissions for this resource"
            )
        return user
    return dependency

async def invalidate_session(token: str, db: AsyncSession) -> None:
    await cache_delete(f"session_user:{token}")
    await db.execute(text("DELETE FROM admin_sessions WHERE token = :token"), {"token": token})
    await db.commit()

