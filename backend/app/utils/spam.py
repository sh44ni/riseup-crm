import re
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Tuple
from app.core.logger import get_logger

logger = get_logger(__name__)

@dataclass
class SpamAttemptRecord:
    block_reason: str           # 'honeypot' | 'speed_trap' | 'turnstile' | 'invalid_phone' | 'spam_content'
    block_detail: str           # detailed reason
    form_type: str              # 'contact' | 'estimate' | 'storm_promo'
    ip_address: Optional[str]   = None
    user_agent: Optional[str]   = None
    page_referer: Optional[str] = None
    payload_snapshot: Optional[Dict[str, Any]] = None


# Common B2B spam & cold outreach phrase patterns
SPAM_PATTERNS = [
    re.compile(r"reply\s+(?:yes|stop)\b", re.IGNORECASE),
    re.compile(r"opt\s*out\b", re.IGNORECASE),
    re.compile(r"\bzoom\s+call\b", re.IGNORECASE),
    re.compile(r"\bvirtual\s+(?:assistant|va)\b", re.IGNORECASE),
    re.compile(r"\b(?:seo|backlink|guest\s*post|domain\s*authority)\b", re.IGNORECASE),
    re.compile(r"\b(?:crypto|bitcoin|forex|telegram\s*group)\b", re.IGNORECASE),
    re.compile(r"\bb2b\s+(?:leads|sales\s*pipeline)\b", re.IGNORECASE),
    re.compile(r"https?://|www\.[a-z0-9]", re.IGNORECASE), # Homeowner roof inquiries do not contain web links
]

MIN_FORM_FILL_TIME_MS = 2500  # 2.5 seconds minimum to read and fill form

def check_honeypots(body: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Checks multi-decoy honeypots.
    Returns (is_bot, reason).
    """
    # 1. Legacy honeypot
    legacy = body.get("honeypot")
    if legacy and str(legacy).strip():
        return True, "legacy_honeypot_filled"

    # 2. Decoy: business_fax
    fax = body.get("business_fax") or body.get("businessFax")
    if fax and str(fax).strip():
        return True, "business_fax_honeypot_filled"

    # 3. Decoy: company_website
    website = body.get("company_website") or body.get("companyWebsite")
    if website and str(website).strip():
        return True, "company_website_honeypot_filled"

    return False, ""

def check_speed_trap(body: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Evaluates form fill duration.
    Returns (is_bot, reason).
    """
    started_at = body.get("formStartedAt") or body.get("form_started_at")
    if not started_at:
        return False, ""

    try:
        start_ts = float(started_at)
        # Handle seconds vs milliseconds
        if start_ts < 1e11:  # Timestamp in seconds
            start_ts = start_ts * 1000

        now_ms = time.time() * 1000
        duration_ms = now_ms - start_ts

        if duration_ms < MIN_FORM_FILL_TIME_MS:
            return True, f"speed_trap_triggered_{duration_ms:.0f}ms"
    except (ValueError, TypeError):
        pass

    return False, ""

def check_spam_content(text_content: Optional[str]) -> Tuple[bool, str]:
    """
    Scans text message or subject for automated solicitation and link patterns.
    Returns (is_spam, reason).
    """
    if not text_content or not str(text_content).strip():
        return False, ""

    text = str(text_content)
    for pattern in SPAM_PATTERNS:
        match = pattern.search(text)
        if match:
            return True, f"spam_phrase_matched_{match.group(0)}"

    return False, ""
