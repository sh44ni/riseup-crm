from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
from urllib.parse import urlencode, quote
import httpx
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.permissions import require_permission
from app.services.reviews import (
    get_google_auth_settings, save_google_auth_settings, sync_google_reviews,
    get_yelp_auth_settings, save_yelp_auth_settings, sync_yelp_reviews
)

router = APIRouter()

# ── GOOGLE OAUTH & SYNC ──────────────────────────────────────────────────────

@router.get("/google-auth")
async def google_auth_redirect(request: Request):
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not set in environment variables.")

    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:8000"
    protocol = request.headers.get("x-forwarded-proto") or ("http" if "localhost" in host else "https")
    redirect_uri = f"{protocol}://{host}/api/admin/google-callback"

    scope = "https://www.googleapis.com/auth/business.manage"
    auth_params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",
        "prompt": "consent",
        "state": "riseup_oauth_sync",
    }
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    return RedirectResponse(url)

@router.get("/google-callback")
async def google_auth_callback(
    request: Request,
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:3000"
    protocol = request.headers.get("x-forwarded-proto") or ("http" if "localhost" in host else "https")
    base_url = f"{protocol}://{host}"

    if error:
        return RedirectResponse(f"{base_url}/admin/reviews?google_error={quote(error)}")

    if not code:
        return RedirectResponse(f"{base_url}/admin/reviews?google_error={quote('No authorization code returned from Google')}")

    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET
    redirect_uri = f"{protocol}://{host}/api/admin/google-callback"

    if not client_id or not client_secret:
        return RedirectResponse(f"{base_url}/admin/reviews?google_error={quote('OAuth credentials missing in environment')}")

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
            return RedirectResponse(f"{base_url}/admin/reviews?google_error={quote(msg)}")

        expires_at = int(datetime.now(timezone.utc).timestamp() * 1000) + (token_data.get("expires_in", 3600) * 1000)

        update_payload = {
            "access_token": token_data.get("access_token"),
            "expires_at": expires_at,
            "last_sync_status": "pending",
            "last_error": None,
        }
        if token_data.get("refresh_token"):
            update_payload["refresh_token"] = token_data["refresh_token"]

        await save_google_auth_settings(db, update_payload)

        # Immediate sync
        sync_result = await sync_google_reviews(db)
        return RedirectResponse(f"{base_url}/admin/reviews?google_connected=success&synced={sync_result.get('syncedCount', 0)}")
    except Exception as err:
        return RedirectResponse(f"{base_url}/admin/reviews?google_error={quote(str(err))}")

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
