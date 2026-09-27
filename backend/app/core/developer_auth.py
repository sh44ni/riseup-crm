import bcrypt
import secrets
import time
from typing import Optional
from fastapi import Request, HTTPException, status, Depends
import orjson

from app.core.config import settings
from app.core.redis import cache_get, cache_set, cache_delete, check_rate_limit

async def verify_seedphrase(seedphrase: str, client_ip: str = "unknown") -> bool:
    """
    Verify the developer seedphrase using bcrypt constant-time comparison.
    Strictly rate-limited to 5 attempts per minute per IP to prevent brute forcing.
    """
    # Rate limit check: 5 attempts per 60 seconds
    allowed, remaining, retry_after = await check_rate_limit(f"rl:dev_seedphrase:{client_ip}", 5, 60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many developer unlock attempts. Try again in {retry_after} seconds."
        )

    if not seedphrase or not settings.DEVELOPER_SEEDPHRASE_HASH:
        return False

    stored_hash = settings.DEVELOPER_SEEDPHRASE_HASH.strip()
    
    # Support both bcrypt hashes ($2b$ prefix) and legacy SHA-256 (64 hex chars)
    # This allows a graceful migration period
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$") or stored_hash.startswith("$2y$"):
        # Modern bcrypt verification
        try:
            return bcrypt.checkpw(seedphrase.strip().encode("utf-8"), stored_hash.encode("utf-8"))
        except Exception:
            return False
    else:
        # Legacy SHA-256 fallback (to be removed after migration)
        import hashlib
        import hmac as _hmac
        entered_hash = hashlib.sha256(seedphrase.strip().encode("utf-8")).hexdigest()
        return _hmac.compare_digest(entered_hash, stored_hash)

_in_memory_dev_sessions = {}

async def create_developer_session(ip_address: Optional[str] = None) -> str:
    """Generate and store a secure 12-hour developer session in Redis with in-memory fallback."""
    token = secrets.token_hex(32)
    session_data = {
        "created_at": time.time(),
        "ip": ip_address or "unknown",
        "role": "developer_superadmin",
    }
    ttl = settings.DEVELOPER_SESSION_HOURS * 3600
    _in_memory_dev_sessions[token] = time.time() + ttl
    await cache_set(
        f"dev_session:{token}",
        orjson.dumps(session_data).decode("utf-8"),
        ttl_seconds=ttl
    )
    return token

async def validate_developer_session(token: str) -> bool:
    if not token or len(token) != 64:
        return False
    exp = _in_memory_dev_sessions.get(token)
    if exp and exp > time.time():
        return True
    try:
        data = await cache_get(f"dev_session:{token}")
        return data is not None
    except Exception:
        return False

async def revoke_developer_session(token: str) -> None:
    if token:
        _in_memory_dev_sessions.pop(token, None)
        await cache_delete(f"dev_session:{token}")

async def require_developer_session(request: Request) -> str:
    """
    FastAPI dependency protecting all /api/developer/* routes.
    Checks cookie 'dev_session' or 'Authorization: Bearer <token>'.
    """
    token = request.cookies.get(settings.DEVELOPER_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

    if not token or not await validate_developer_session(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Developer access locked. Valid seedphrase session required."
        )

    return token
