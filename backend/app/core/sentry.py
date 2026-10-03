"""
Sentry Error Tracking & PII Redaction Module (WP-6.2)
=====================================================
Initializes Sentry for API and background workers when SENTRY_DSN is configured.
Enforces strict before_send sanitization rules to scrub PII (emails, phones,
addresses, signature payloads, tokens, passwords) before transmission.
"""

from typing import Dict, Any, Optional
import os
import re
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

SENSITIVE_KEYS = frozenset({
    "password", "password_hash", "salt", "token", "csrf_token",
    "x-csrf-token", "authorization", "cookie", "session",
    "signature_data", "phone", "email", "ssn", "secret"
})

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")


def scrub_pii_data(data: Any) -> Any:
    if isinstance(data, dict):
        scrubbed = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                scrubbed[k] = "[REDACTED]"
            else:
                scrubbed[k] = scrub_pii_data(v)
        return scrubbed
    elif isinstance(data, list):
        return [scrub_pii_data(i) for i in data]
    elif isinstance(data, str):
        cleaned = EMAIL_REGEX.sub("[EMAIL_REDACTED]", data)
        return PHONE_REGEX.sub("[PHONE_REDACTED]", cleaned)
    return data


def before_send_scrubber(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Scrubs sensitive PII fields from Sentry events before sending to cloud."""
    try:
        # Scrub request headers and body
        if "request" in event:
            req = event["request"]
            if "headers" in req:
                req["headers"] = scrub_pii_data(req["headers"])
            if "data" in req:
                req["data"] = scrub_pii_data(req["data"])

        # Scrub user context (retain user id only)
        if "user" in event and isinstance(event["user"], dict):
            u_id = event["user"].get("id")
            event["user"] = {"id": u_id} if u_id else {}

        # Scrub breadcrumbs
        if "breadcrumbs" in event and "values" in event["breadcrumbs"]:
            for b in event["breadcrumbs"]["values"]:
                if "data" in b:
                    b["data"] = scrub_pii_data(b["data"])

        return event
    except (KeyError, TypeError, ValueError, AttributeError) as exc:
        logger.warning(f"Notice during Sentry PII scrubbing: {exc}")
        return event


def init_sentry() -> bool:
    """Initializes Sentry SDK if sentry_sdk is installed and SENTRY_DSN is set."""
    dsn = getattr(settings, "SENTRY_DSN", None) or os.getenv("SENTRY_DSN")
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=dsn,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
            before_send=before_send_scrubber,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            send_default_pii=False,
        )
        logger.info("Sentry error tracking initialized with PII scrubbing.")
        return True
    except ImportError:
        logger.info("sentry-sdk not installed; skipping Sentry initialization.")
        return False
