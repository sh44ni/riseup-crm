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


# Common B2B spam, cold outreach, and bot solicitation phrase patterns
SPAM_PATTERNS = [
    # Virtual Assistant / Offshore Staffing outreach
    re.compile(r"\b(?:virtual\s+)?assistants?\b", re.IGNORECASE),
    re.compile(r"\b(?:trained\s+|dedicated\s+|offshore\s+|part-time\s+|full-time\s+)?va['’s]*\b", re.IGNORECASE),
    re.compile(r"\b(?:delegate\s+tasks?|replaces?\s+(?:the\s+)?workload)\b", re.IGNORECASE),
    re.compile(r"\b(?:hire\s+(?:a\s+)?va|offshore\s+team|remote\s+staff(?:ing)?)\b", re.IGNORECASE),
    re.compile(r"\b10-person\s+team\b", re.IGNORECASE),

    # Marketing, Lead Gen, and Sales Pipeline agency solicitations
    re.compile(r"\b(?:lead\s*gen(?:eration)?|sales\s*pipeline|appointment\s*setting)\b", re.IGNORECASE),
    re.compile(r"\b(?:crm\s*management|cold\s*outreach|scale\s*your\s*business)\b", re.IGNORECASE),
    re.compile(r"\bopen\s+to\s+discussion\??\b", re.IGNORECASE),
    re.compile(r"\breply\s+(?:yes|stop|interested)\b", re.IGNORECASE),
    re.compile(r"\bopt\s*out\b", re.IGNORECASE),
    re.compile(r"\bzoom\s+call\b", re.IGNORECASE),

    # SEO, Backlinks, Guest Posts & Digital Marketing solicitations
    re.compile(r"\b(?:seo|backlinks?|guest\s*posts?|domain\s*authority|search\s*traffic)\b", re.IGNORECASE),
    re.compile(r"\b(?:audit\s+your\s+site|free\s+seo\s+review|page\s+1\s+on\s+google)\b", re.IGNORECASE),

    # Custom AI & Bot pitches
    re.compile(r"\b(?:custom-built\s+ai|ai\s+system|mavis)\b", re.IGNORECASE),

    # Financial / Crypto / Links
    re.compile(r"\b(?:crypto|bitcoin|forex|telegram\s*group)\b", re.IGNORECASE),
    re.compile(r"https?://|www\.[a-z0-9]", re.IGNORECASE), # Legitimate homeowner inquiries do not contain web links
]

# Suspicious email domains & keyword fragments used in automated B2B solicitation
SPAM_EMAIL_DOMAIN_PATTERNS = [
    re.compile(r"@[a-z0-9._-]*(?:vettedvas|vasdirect|hirevas|teamva|remoteteam|growthagency|leadgen|coldemail|b2bleads|seoagency)[a-z0-9._-]*\.[a-z]{2,}", re.IGNORECASE),
    re.compile(r"@[a-z0-9._-]*(?:-vas|\.vas|vasdirect|virtualassist)[a-z0-9._-]*\.[a-z]{2,}", re.IGNORECASE),
]

MIN_FORM_FILL_TIME_MS = 3000  # 3.0 seconds minimum to read and fill form

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

    # 4. Decoy: contact_secondary_email
    sec_email = body.get("contact_secondary_email") or body.get("secondary_email")
    if sec_email and str(sec_email).strip():
        return True, "secondary_email_honeypot_filled"

    return False, ""

def check_speed_trap(body: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Evaluates form fill duration.
    Requires a valid formStartedAt timestamp from legitimate frontend forms.
    Returns (is_bot, reason).
    """
    started_at = body.get("formStartedAt") or body.get("form_started_at")
    if not started_at:
        # Reject direct headless script POSTs that bypass the frontend form
        return True, "speed_trap_missing_timestamp"

    try:
        start_ts = float(started_at)
        # Handle seconds vs milliseconds
        if start_ts < 1e11:  # Timestamp in seconds
            start_ts = start_ts * 1000

        now_ms = time.time() * 1000
        duration_ms = now_ms - start_ts

        # Detect future timestamps (clock skew manipulation)
        if duration_ms < 0:
            return True, "speed_trap_future_timestamp"

        if duration_ms < MIN_FORM_FILL_TIME_MS:
            return True, f"speed_trap_triggered_{duration_ms:.0f}ms"
    except (ValueError, TypeError):
        return True, "speed_trap_invalid_timestamp"

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

def check_spam_email(email_address: Optional[str]) -> Tuple[bool, str]:
    """
    Scans email address domain for cold solicitation agencies or spam rings.
    Returns (is_spam, reason).
    """
    if not email_address or not str(email_address).strip():
        return False, ""

    email = str(email_address).strip().lower()
    for pattern in SPAM_EMAIL_DOMAIN_PATTERNS:
        match = pattern.search(email)
        if match:
            return True, f"spam_email_domain_{match.group(0)}"

    return False, ""
