import hashlib
import hmac
from typing import Optional, Set
from fastapi import Request, HTTPException, status
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

from app.core.public_routes import PUBLIC_BACKEND_ROUTES, is_public_backend_route

# Fallback secret for dev/test when SESSION_SECRET_KEY is not populated
_DEV_CSRF_SECRET = "riseup_csrf_default_signing_key_p5_development_only"

SAFE_METHODS: Set[str] = {"GET", "HEAD", "OPTIONS"}


def get_signing_key() -> bytes:
    key = settings.SESSION_SECRET_KEY.strip() if settings.SESSION_SECRET_KEY else _DEV_CSRF_SECRET
    return key.encode("utf-8")

def generate_csrf_token(session_token: str) -> str:
    """Derives a deterministic HMAC-SHA256 CSRF token for a given user session token."""
    if not session_token:
        return ""
    return hmac.new(get_signing_key(), session_token.encode("utf-8"), hashlib.sha256).hexdigest()

def verify_csrf_token(submitted_token: Optional[str], session_token: Optional[str]) -> bool:
    """Verifies that the submitted CSRF token matches the session token using constant-time comparison."""
    if not submitted_token or not session_token:
        return False
    expected = generate_csrf_token(session_token)
    return hmac.compare_digest(submitted_token.strip(), expected)

def is_allowed_origin(origin: str) -> bool:
    if not origin:
        return False
    clean = origin.rstrip("/")
    # Check explicitly configured CORS origins
    cors_list = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
    for allowed in cors_list:
        if clean == allowed.rstrip("/"):
            return True
    # Localhost development
    if clean.startswith("http://localhost:") or clean.startswith("http://127.0.0.1:"):
        return True
    # Apex & subdomains
    if clean.endswith(".riseuprac.com") or clean == "https://riseuprac.com":
        return True
    if clean.endswith(".vercel.app"):
        return True
    return False

def extract_session_cookie(request: Request) -> Optional[str]:
    """Retrieves session token from known cookie keys (__Host-session, admin_session, session)."""
    return (
        request.cookies.get("__Host-session")
        or request.cookies.get(settings.COOKIE_NAME)
        or request.cookies.get("session")
    )

def check_csrf(request: Request) -> None:
    """
    Validates CSRF token for state-changing requests authenticated via session cookies.
    API keys and Bearer-only legacy requests are exempt.
    """
    if request.method in SAFE_METHODS:
        return

    path = request.url.path
    if is_public_backend_route(path):
        return


    # Check if request is authenticated via API Key -> exempt from CSRF
    api_key = request.headers.get("x-api-key") or request.headers.get("x-client-key")
    auth_header = request.headers.get("authorization", "")
    if api_key or (auth_header.startswith("Bearer rup_")):
        return

    session_cookie = extract_session_cookie(request)
    if not session_cookie:
        # If no cookie is present, request is either unauthenticated (which auth middleware handles)
        # or legacy Bearer token only (which is exempt during rollout if enabled)
        if settings.LEGACY_BEARER_AUTH and auth_header.startswith("Bearer "):
            return
        return

    # Defense in depth: Verify Origin / Referer if present
    origin = request.headers.get("origin")
    if origin and not is_allowed_origin(origin):
        logger.warning(f"CSRF defense: rejected request with disallowed origin: {origin}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Request origin not allowed."
        )

    # Require and verify X-CSRF-Token
    csrf_header = request.headers.get(settings.CSRF_HEADER_NAME) or request.headers.get("x-csrf-token")
    if not csrf_header or not verify_csrf_token(csrf_header, session_cookie):
        logger.warning(f"CSRF verification failed for path: {path}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed: missing or invalid CSRF token."
        )
