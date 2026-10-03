import httpx
from typing import Optional
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

async def verify_turnstile_token(token: Optional[str], ip_address: Optional[str] = None) -> bool:
    """
    Verifies a Cloudflare Turnstile token with Cloudflare's siteverify API.
    Returns True if the token is valid, or False if invalid/bot detected.
    """
    secret_key = settings.CLOUDFLARE_TURNSTILE_SECRET_KEY
    if not secret_key:
        logger.warning("CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured; skipping verification.")
        return True

    if not token or not str(token).strip():
        logger.info("Turnstile verification failed: missing or empty token.")
        return False

    payload = {
        "secret": secret_key,
        "response": str(token).strip(),
    }
    if ip_address:
        payload["remoteip"] = ip_address

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(TURNSTILE_VERIFY_URL, data=payload)
            if resp.status_code != 200:
                logger.error(f"Turnstile siteverify HTTP error: {resp.status_code} - {resp.text}")
                return False

            result = resp.json()
            is_success = bool(result.get("success", False))
            if not is_success:
                error_codes = result.get("error-codes", [])
                logger.info(f"Turnstile token verification rejected by Cloudflare: {error_codes}")
            return is_success

    except httpx.TimeoutException:
        logger.warning("Turnstile siteverify timed out after 5s. Failing open to protect human conversions.")
        return True
    except Exception as e:
        logger.error(f"Turnstile verification unexpected exception: {e}")
        return True
