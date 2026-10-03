from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from urllib.parse import urlencode, quote
import secrets
import httpx
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.logger import get_logger
from app.core.permissions import AuthUser, has_permission, require_permission
from app.core.redis import cache_pop, cache_set
from app.middlewares.auth import get_optional_current_user
from app.services.reviews import (
    get_google_auth_settings, save_google_auth_settings, sync_google_reviews,
    get_yelp_auth_settings, save_yelp_auth_settings, sync_yelp_reviews
)

logger = get_logger(__name__)
router = APIRouter()

OAUTH_STATE_TTL_SECONDS = 600
OAUTH_STATE_PREFIX = "oauth_state:"

# ── GOOGLE OAUTH & SYNC ──────────────────────────────────────────────────────

def _google_redirect_uri() -> str:
    """Callback URL comes from configuration only, never from request headers."""
    if settings.GOOGLE_REDIRECT_URI:
        return settings.GOOGLE_REDIRECT_URI
    if settings.PUBLIC_BACKEND_URL:
        return f"{settings.PUBLIC_BACKEND_URL.rstrip('/')}/api/admin/google-callback"
    return ""


def _reviews_url(**query: str) -> str:
    base = settings.CRM_FRONTEND_URL.rstrip("/")
    return f"{base}/admin/reviews?{urlencode(query, quote_via=quote)}"


@router.get("/google-auth")
async def google_auth_redirect(
    user: AuthUser = Depends(require_permission("reviews:manage")),
):
    client_id = settings.GOOGLE_CLIENT_ID
    redirect_uri = _google_redirect_uri()
    if not client_id or not redirect_uri:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")

    state = secrets.token_urlsafe(32)
    await cache_set(f"{OAUTH_STATE_PREFIX}{state}", str(user.id), ttl_seconds=OAUTH_STATE_TTL_SECONDS)

    scope = "https://www.googleapis.com/auth/business.manage"
    auth_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    return RedirectResponse(url)

@router.get("/google-callback")
async def google_auth_callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Optional[AuthUser] = Depends(get_optional_current_user),
):
    # The state is single-use: consume it first so a replayed or forged callback cannot succeed.
    stored_user_id = await cache_pop(f"{OAUTH_STATE_PREFIX}{state}") if state else None
    if stored_user_id is None:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state.")
    if user is None or str(user.id) != stored_user_id or not has_permission(user, "reviews:manage"):
        raise HTTPException(status_code=400, detail="OAuth state does not match the signed-in user.")

    if error:
        return RedirectResponse(_reviews_url(google_error=error))

    if not code:
        return RedirectResponse(_reviews_url(google_error="No authorization code returned from Google"))

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = _google_redirect_uri()

    if not client_id or not client_secret or not redirect_uri:
        return RedirectResponse(_reviews_url(google_error="OAuth credentials missing in environment"))

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                }
            )
            token_data = token_res.json()

        if not token_res.is_success or (not token_data.get("refresh_token") and not token_data.get("access_token")):
            msg = token_data.get("error_description") or token_data.get("error") or "Failed to exchange authorization code"
            return RedirectResponse(_reviews_url(google_error=msg))

        expires_at = int(datetime.now(timezone.utc).timestamp() * 1000) + (token_data.get("expires_in", 3600) * 1000)

        update_payload = {
            "access_token": token_data.get("access_token"),
            "expires_at": expires_at,
            "last_sync_status": "pending",
            "last_error": None,
            "connected_by_user_id": user.id,
        }
        if token_data.get("refresh_token"):
            update_payload["refresh_token"] = token_data["refresh_token"]

        await save_google_auth_settings(db, update_payload)

        # Immediate sync
        sync_result = await sync_google_reviews(db)
        return RedirectResponse(_reviews_url(google_connected="success", synced=str(sync_result.get("syncedCount", 0))))
    except Exception:
        logger.exception("Google OAuth callback failed")
        return RedirectResponse(_reviews_url(google_error="Google connection failed. Please try again."))

@router.get("/google-sync")
async def get_google_sync_status(
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    s = await get_google_auth_settings(db) or {}
    is_connected = bool(s.get("refresh_token"))
    return {
        "isConnected": is_connected,
        "businessName": s.get("business_name"),
        "accountName": s.get("account_name"),
        "locationName": s.get("location_name"),
        "lastSyncedAt": s.get("last_synced_at"),
        "lastSyncStatus": s.get("last_sync_status"),
        "lastSyncCount": s.get("last_sync_count", 0),
        "lastError": s.get("last_error"),
    }

@router.post("/google-sync")
async def trigger_google_sync(
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    return await sync_google_reviews(db)

# ── YELP SYNC ────────────────────────────────────────────────────────────────

@router.get("/yelp-sync")
async def get_yelp_sync_status(
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    s = await get_yelp_auth_settings(db)
    api_key = s.get("api_key")
    is_connected = bool(api_key)
    masked_key = f"{api_key[:6]}...{api_key[-4:]}" if (api_key and len(api_key) > 10) else None

    return {
        "isConnected": is_connected,
        "businessId": s.get("business_id"),
        "businessAlias": s.get("business_alias"),
        "businessName": s.get("business_name", "Rise Up Roofing And Construction"),
        "businessRating": s.get("business_rating", 5.0),
        "businessReviewCount": s.get("business_review_count", 1),
        "businessUrl": s.get("business_url", "https://www.yelp.com/biz/rise-up-roofing-and-construction-oceanside-2"),
        "lastSyncedAt": s.get("last_synced_at"),
        "lastSyncStatus": s.get("last_sync_status"),
        "lastSyncCount": s.get("last_sync_count", 0),
        "lastError": s.get("last_error"),
        "apiKeyMasked": masked_key,
    }

@router.post("/yelp-sync")
async def trigger_yelp_sync(
    payload: Optional[Dict[str, Any]] = None,
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    if payload:
        updates = {}
        if payload.get("apiKey"):
            updates["api_key"] = payload["apiKey"].strip()
        if payload.get("businessId"):
            updates["business_id"] = payload["businessId"].strip()
        if updates:
            await save_yelp_auth_settings(db, updates)

    return await sync_yelp_reviews(db)
