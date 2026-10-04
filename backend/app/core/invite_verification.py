"""Email-ownership gate for team invitations.

An invitation token on its own is never enough to create an account. The invitee must
first prove they control the invited inbox by entering the 6-digit code emailed to them
(``/api/admin/auth/verify-otp``). Only then is the token "unlocked" for a short window,
and ``/api/public/invitations/{token}`` (details + accept) will serve it.
"""
from typing import Optional

from app.core.redis import cache_get, cache_delete

INVITE_VERIFIED_TTL = 30 * 60  # seconds the invitee has to finish account setup after verifying


def invite_verified_key(token: str) -> str:
    return f"invite:verified:{token.strip()}"


async def get_verified_invite_email(token: str) -> Optional[str]:
    """Returns the email that unlocked this token via OTP, or None if not (or no longer) unlocked."""
    val = await cache_get(invite_verified_key(token))
    if not val:
        return None
    if isinstance(val, bytes):
        val = val.decode("utf-8", "ignore")
    return str(val).strip().strip('"').lower() or None


async def clear_invite_verification(token: str) -> None:
    await cache_delete(invite_verified_key(token))
