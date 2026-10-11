"""
Company Contractor Signature Service
====================================
Single source of truth for the company contractor signature (Edith Guerrero).

The signature lives in the append-only ``company_signature_versions`` table. The current
signature is the highest ``version``. Contracts snapshot the signatory name/title into
``contract_data`` so every contractor reference in the document points to the configured
signatory, and the counter-sign step stamps the signature itself.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

SIGNATURE_NOT_CONFIGURED_DETAIL = (
    "The company contractor signature has not been set up yet. "
    "Someone with Edit access must set it up in Settings → Company Signature first."
)

# Human-readable labels for changed_fields (kept in sync with the CRM history view).
TRACKED_FIELDS = ("signer_name", "signer_title", "signature_type", "signature_data")

_VERSION_COLUMNS = """
    v.id, v.version, v.action, v.signer_name, v.signer_title, v.signature_type,
    v.reason, v.changed_fields, v.changed_by_user_id, v.changed_by_name,
    v.changed_by_email, v.created_at
"""


def _iso(value: Any) -> Optional[str]:
    return value.isoformat() if hasattr(value, "isoformat") else (str(value) if value else None)


def serialize_version(row: Any, include_data: bool = False) -> Dict[str, Any]:
    d = dict(row)
    out = {
        "id": d.get("id"),
        "version": d.get("version"),
        "action": d.get("action"),
        "signer_name": d.get("signer_name"),
        "signer_title": d.get("signer_title"),
        "signature_type": d.get("signature_type"),
        "reason": d.get("reason"),
        "changed_fields": list(d.get("changed_fields") or []),
        "changed_by_user_id": d.get("changed_by_user_id"),
        "changed_by_name": d.get("changed_by_name"),
        "changed_by_email": d.get("changed_by_email"),
        "created_at": _iso(d.get("created_at")),
    }
    if include_data:
        out["signature_data"] = d.get("signature_data")
    return out


async def get_current_signature(db: AsyncSession) -> Optional[Dict[str, Any]]:
    """Return the current company signature (including image data) or ``None``."""
    row = (await db.execute(text(f"""
        SELECT {_VERSION_COLUMNS}, v.signature_data,
               first_v.created_at AS configured_at,
               first_v.changed_by_name AS configured_by_name
        FROM company_signature_versions v
        CROSS JOIN LATERAL (
            SELECT created_at, changed_by_name FROM company_signature_versions
            ORDER BY version ASC LIMIT 1
        ) first_v
        ORDER BY v.version DESC
        LIMIT 1
    """))).mappings().first()
    if not row:
        return None
    data = serialize_version(row, include_data=True)
    data["configured_at"] = _iso(row.get("configured_at"))
    data["configured_by_name"] = row.get("configured_by_name")
    data["updated_at"] = data["created_at"]
    data["updated_by_name"] = data["changed_by_name"]
    return data


async def get_signature_status(db: AsyncSession) -> Dict[str, Any]:
    """Lightweight, image-free status used by the contract wizard."""
    row = (await db.execute(text("""
        SELECT version, signer_name, signer_title, created_at
        FROM company_signature_versions
        ORDER BY version DESC
        LIMIT 1
    """))).mappings().first()
    if not row:
        return {"configured": False, "signer_name": None, "signer_title": None, "version": None, "updated_at": None}
    return {
        "configured": True,
        "signer_name": row["signer_name"],
        "signer_title": row["signer_title"],
        "version": row["version"],
        "updated_at": _iso(row["created_at"]),
    }


async def list_signature_history(db: AsyncSession, limit: int = 100) -> List[Dict[str, Any]]:
    rows = (await db.execute(
        text(f"SELECT {_VERSION_COLUMNS} FROM company_signature_versions v ORDER BY v.version DESC LIMIT :lim"),
        {"lim": limit},
    )).mappings().all()
    return [serialize_version(r) for r in rows]


async def get_signature_version(db: AsyncSession, version: int) -> Optional[Dict[str, Any]]:
    row = (await db.execute(
        text(f"SELECT {_VERSION_COLUMNS}, v.signature_data FROM company_signature_versions v WHERE v.version = :ver"),
        {"ver": version},
    )).mappings().first()
    return serialize_version(row, include_data=True) if row else None


def is_contract_counter_signed(contract_data: Dict[str, Any]) -> bool:
    return bool(contract_data.get("is_counter_signed") or contract_data.get("counter_signed_at"))


async def stamp_signatory_on_contract_data(
    db: AsyncSession,
    contract_data: Dict[str, Any],
    signature: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Point every contractor reference of a not-yet-executed contract to the configured
    company signatory. Executed contracts keep the signatory they were signed with.
    Returns the signature used (or ``None`` when no signature is configured).
    """
    if is_contract_counter_signed(contract_data):
        return signature
    if signature is None:
        status = await get_signature_status(db)
        signature = status if status.get("configured") else None
    contract_data["contractor_signatory_name"] = (signature or {}).get("signer_name") or ""
    contract_data["contractor_signatory_title"] = (signature or {}).get("signer_title") or ""
    # Legacy per-representative signatory fields are retired.
    for legacy in ("is_representative_signatory", "representative_name", "representative_title",
                   "isRepresentativeSignatory", "representativeName", "representativeTitle"):
        contract_data.pop(legacy, None)
    return signature
