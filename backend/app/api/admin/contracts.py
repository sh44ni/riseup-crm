"""
Contract API Routes
===================
Endpoints for building, previewing, sending, and signing Home Improvement Contracts.

All endpoints require authentication via ``require_auth``.
"""

from app.core.logger import get_logger
import os
import json
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.core.audit import record_audit_log
from app.core.permissions import has_permission, check_resource_access
from app.middlewares.auth import require_auth, require_permission, require_signature_access
from app.services.contract_pdf_generator import generate_contract_pdf, save_contract_pdf, _clean_address_string
from app.services.company_signature import (
    SIGNATURE_NOT_CONFIGURED_DETAIL,
    get_current_signature,
    get_signature_status,
    stamp_signatory_on_contract_data,
)
from app.services.email_service import send_contract_email
from app.utils.formatting import format_person_name
logger = get_logger(__name__)

def format_contract_data(data: Dict[str, Any]) -> Dict[str, Any]:
    if not data or not isinstance(data, dict):
        return {}
    formatted = dict(data)
    if formatted.get("client_name"):
        formatted["client_name"] = format_person_name(formatted["client_name"])
    if formatted.get("clientName"):
        formatted["clientName"] = format_person_name(formatted["clientName"])
    if formatted.get("project_address"):
        formatted["project_address"] = _clean_address_string(formatted["project_address"])
    if formatted.get("projectAddress"):
        formatted["projectAddress"] = _clean_address_string(formatted["projectAddress"])
    return formatted

router = APIRouter(prefix="/contracts", tags=["Admin Contracts"], dependencies=[Depends(require_permission("contracts.view"))])

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class BuildContractRequest(BaseModel):
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    contract_id: Optional[int] = None
    estimate_id: Optional[int] = None
    contract_data: Dict[str, Any]  # All Jinja2 template fields


def _get_base_url(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        from urllib.parse import urlparse
        p = urlparse(origin)
        return f"{p.scheme}://{p.netloc}".rstrip("/")
    return getattr(settings, "CRM_FRONTEND_URL", "http://localhost:5173").rstrip("/")


class SendContractRequest(BaseModel):
    to_email: str
    custom_message: Optional[str] = None


class SendContractSmsRequest(BaseModel):
    phone: str
    custom_message: Optional[str] = None


class SignContractRequest(BaseModel):
    signed_by: str  # Client's full name as entered
    signature_date: Optional[str] = None


class AutoSaveDraftRequest(BaseModel):
    contract_data: Dict[str, Any]


class CounterSignContractRequest(BaseModel):
    """Optional, ignored body. The company contractor signature is always applied server-side."""
    model_config = ConfigDict(extra="ignore")


# ---------------------------------------------------------------------------
# GET /api/admin/contracts (List all contracts with summaries)
# ---------------------------------------------------------------------------

@router.get("", dependencies=[Depends(require_permission("contracts.view"))])
async def list_contracts(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    List all contracts with joined lead and customer information, summary statistics,
    and filter support.
    """
    query_str = """
        SELECT c.id, c.contract_number,
               CASE
                   WHEN c.counter_signed_at IS NOT NULL THEN 'signed'
                   WHEN c.client_signed_at IS NOT NULL THEN 'client_signed'
                   ELSE c.status
               END AS status,
               c.is_archived, c.client_signed_at, c.counter_signed_at,
               c.signed_pdf_url, c.client_initials, c.signature_name,
               c.created_at, c.updated_at, c.lead_id, c.client_id, c.estimate_id, c.job_id,
               l.full_name AS customer_name, l.phone AS customer_phone, l.email AS customer_email,
               l.address AS customer_address, l.city AS customer_city, l.service_type,
               l.estimated_value, l.assigned_to, l.pipeline_stage
        FROM contracts c
        LEFT JOIN leads l ON (c.lead_id = l.id OR (c.lead_id IS NULL AND c.client_id IS NOT NULL AND c.client_id = l.client_id))
        WHERE 1=1
    """
    params = {}
    if status == "archived":
        query_str += " AND c.is_archived = true"
    else:
        query_str += " AND c.is_archived = false"
        if status and status != "all":
            query_str += " AND c.status = :status"
            params["status"] = status
    if search:
        query_str += " AND (c.contract_number ILIKE :search OR l.full_name ILIKE :search OR l.address ILIKE :search)"
        params["search"] = f"%{search}%"
    
    query_str += " ORDER BY c.created_at DESC"

    res = await db.execute(text(query_str), params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    from app.services.contract_pdf_generator import STATIC_UPLOADS_CONTRACTS_DIR

    total_value = 0.0
    signed_value = 0.0
    signed_count = 0
    client_signed_count = 0
    sent_count = 0
    draft_count = 0

    contract_dir_files: Optional[List[str]] = None

    for row in rows:
        val = float(row.get("estimated_value") or 0.0)
        total_value += val
        if row["status"] == "signed":
            signed_count += 1
            signed_value += val
        elif row["status"] == "client_signed":
            client_signed_count += 1
        elif row["status"] == "sent":
            sent_count += 1
        else:
            draft_count += 1

        # Check for PDF file - prefer signed_pdf_url if set, otherwise lookup in cached dir list
        if row.get("signed_pdf_url"):
            row["pdf_url"] = row["signed_pdf_url"]
        else:
            if contract_dir_files is None:
                try:
                    contract_dir_files = os.listdir(STATIC_UPLOADS_CONTRACTS_DIR)
                except Exception:
                    contract_dir_files = []
            cnum = (row["contract_number"] or str(row["id"])).replace("/", "_").replace(" ", "_")
            prefix = f"Contract_{cnum}_"
            try:
                files = [f for f in contract_dir_files if f.startswith(prefix) and f.endswith(".pdf")]
                if files:
                    if row["status"] in ("signed", "client_signed"):
                        signed_f = [f for f in files if "_signed_" in f]
                        if signed_f:
                            files = signed_f
                    files.sort(
                        key=lambda f: os.path.getmtime(os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, f)),
                        reverse=True,
                    )
                    row["pdf_url"] = f"/static/uploads/contracts/{files[0]}"
                else:
                    row["pdf_url"] = None
            except Exception:
                row["pdf_url"] = None

        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()

    archived_res = await db.execute(text("SELECT COUNT(*) FROM contracts WHERE is_archived = true"))
    archived_count = int(archived_res.scalar() or 0)

    summary = {
        "totalCount": len(rows),
        "signedCount": signed_count,
        "clientSignedCount": client_signed_count,
        "sentCount": sent_count,
        "draftCount": draft_count,
        "archivedCount": archived_count,
        "totalValue": total_value,
        "signedValue": signed_value,
    }

    return {"contracts": rows, "summary": summary}



# ---------------------------------------------------------------------------
# POST /api/admin/contracts/build
# ---------------------------------------------------------------------------

@router.post("/build", dependencies=[Depends(require_permission("contracts.view"))])
async def build_contract(
    payload: BuildContractRequest,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Build a new contract: validate the lead, generate a contract number,
    create a DB record, render the PDF, and persist it to disk.

    Returns: ``{ contract_id, contract_number, pdf_url, status }``
    """
    # 1. Resolve lead and client information if provided
    lead_row = None
    client_id = payload.client_id
    if payload.lead_id:
        lead_res = await db.execute(
            text("SELECT id, client_id, pipeline_stage FROM leads WHERE id = :id"),
            {"id": payload.lead_id},
        )
        lead_row = lead_res.first()
        if lead_row and lead_row.client_id:
            client_id = lead_row.client_id

    # 2. Check if an existing contract was passed to update, or if an active draft exists for this lead / client
    existing_contract = None
    if payload.contract_id:
        c_res = await db.execute(
            text("SELECT * FROM contracts WHERE id = :id"),
            {"id": payload.contract_id},
        )
        existing_contract = c_res.mappings().first()
    elif payload.lead_id or client_id:
        conditions = []
        c_params = {}
        if payload.lead_id:
            conditions.append("c.lead_id = :lid")
            c_params["lid"] = payload.lead_id
        if client_id:
            conditions.append("c.client_id = :cid")
            c_params["cid"] = client_id
        c_res = await db.execute(
            text(f"""
                SELECT c.* FROM contracts c
                WHERE ({" OR ".join(conditions)})
                  AND c.status = 'draft' AND c.is_archived = false
                ORDER BY c.updated_at DESC LIMIT 1
            """),
            c_params,
        )
        existing_contract = c_res.mappings().first()

    if existing_contract:
        contract_id = existing_contract["id"]
        contract_number = existing_contract["contract_number"] or f"RU-{datetime.now(timezone.utc).year}-{contract_id:05d}"
        signing_token = existing_contract.get("signing_token") or secrets.token_urlsafe(24)
        
        contract_data = format_contract_data(dict(payload.contract_data))
        await stamp_signatory_on_contract_data(db, contract_data)
        contract_data["contract_number"] = contract_number
        contract_data["is_signed"] = bool(existing_contract.get("status") == "signed")
        contract_data["client_initials"] = existing_contract.get("client_initials") or ""
        contract_data["client_signature_name"] = existing_contract.get("signature_name") or ""
        contract_data["client_signature_data"] = existing_contract.get("signature_data") or ""

        await db.execute(
            text("""
                UPDATE contracts
                SET contract_data = :contract_data,
                    signing_token = :signing_token,
                    client_id = COALESCE(:client_id, client_id),
                    lead_id = COALESCE(:lead_id, lead_id),
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "contract_data": json.dumps(contract_data),
                "signing_token": signing_token,
                "client_id": client_id,
                "lead_id": payload.lead_id,
                "id": contract_id,
            },
        )
        await db.commit()
    else:
        # 3. Generate contract number
        lead_num = payload.lead_id or client_id or 1
        contract_number = f"RU-{datetime.now(timezone.utc).year}-{lead_num:05d}"

        # 4. Check for existing contract with the same number to ensure uniqueness
        existing = await db.execute(
            text("SELECT id FROM contracts WHERE contract_number = :cn"),
            {"cn": contract_number},
        )
        if existing.first():
            ts = datetime.now(timezone.utc).strftime("%H%M%S")
            contract_number = f"{contract_number}-{ts}"

        # 5. Prepare contract data for empty unsigned template
        signing_token = secrets.token_urlsafe(24)
        contract_data = format_contract_data(dict(payload.contract_data))
        await stamp_signatory_on_contract_data(db, contract_data)
        contract_data["contract_number"] = contract_number
        contract_data["is_signed"] = False
        contract_data["client_initials"] = ""
        contract_data["client_signature_name"] = ""
        contract_data["client_signature_data"] = ""

        # 6. Insert new contract record with signing token and snapshot data
        insert_stmt = text("""
            INSERT INTO contracts (lead_id, estimate_id, client_id, contract_number, status, signing_token, contract_data, created_at, updated_at)
            VALUES (:lead_id, :estimate_id, :client_id, :contract_number, 'draft', :signing_token, :contract_data, NOW(), NOW())
            RETURNING id
        """)
        result = await db.execute(
            insert_stmt,
            {
                "lead_id": payload.lead_id,
                "estimate_id": payload.estimate_id,
                "client_id": client_id,
                "contract_number": contract_number,
                "signing_token": signing_token,
                "contract_data": json.dumps(contract_data),
            },
        )
        contract_id = result.scalar()
        await db.commit()

    # Enforce strictly 1 active draft per lead / client: archive any other stale drafts
    cleanup_params = {"current_id": contract_id}
    cleanup_conds = []
    if payload.lead_id:
        cleanup_conds.append("lead_id = :lid")
        cleanup_params["lid"] = payload.lead_id
    if client_id:
        cleanup_conds.append("client_id = :cid")
        cleanup_params["cid"] = client_id

    if cleanup_conds:
        await db.execute(
            text(f"""
                UPDATE contracts
                SET is_archived = true, updated_at = NOW()
                WHERE id != :current_id
                  AND ({" OR ".join(cleanup_conds)})
                  AND status = 'draft'
                  AND is_archived = false
            """),
            cleanup_params,
        )
        await db.commit()

    # 7. Generate and save empty PDF
    try:
        pdf_url = await save_contract_pdf(contract_data, contract_id)
    except Exception:
        logger.exception("Contract PDF generation failed (contract_id=%s)", contract_id)
        raise HTTPException(status_code=500, detail="PDF generation failed")

    base_url = _get_base_url(request)
    signing_url = f"{base_url}/contract/sign/{signing_token}"

    # 8. Audit log
    await record_audit_log(
        db=db,
        action="contract.build",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "contract_number": contract_number,
            "lead_id": payload.lead_id,
            "pdf_url": pdf_url,
            "signing_token": signing_token,
        },
        request=request,
    )

    return {
        "contract_id": contract_id,
        "contract_number": contract_number,
        "pdf_url": pdf_url,
        "signing_token": signing_token,
        "signing_url": signing_url,
        "status": "draft",
    }


# ---------------------------------------------------------------------------
# POST /api/admin/contracts/{contract_id}/send
# ---------------------------------------------------------------------------

@router.post("/{contract_id}/send", dependencies=[Depends(require_permission("contracts.view"))])
async def send_contract(
    contract_id: int,
    payload: SendContractRequest,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate (or regenerate) the contract PDF, email it to the client,
    update the contract status to *sent*, and advance the lead pipeline stage
    to ``contract_sent``.

    Returns: ``{ success, email_id, contract_id, status }``
    """
    # 1. Load contract
    contract_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    # Contracts cannot go out until the company contractor signature is configured.
    signature_status = await get_signature_status(db)
    if not signature_status.get("configured"):
        raise HTTPException(status_code=409, detail=SIGNATURE_NOT_CONFIGURED_DETAIL)

    # 2. Ensure signing_token exists
    signing_token = contract.get("signing_token")
    if not signing_token:
        signing_token = secrets.token_urlsafe(24)
        await db.execute(
            text("UPDATE contracts SET signing_token = :st WHERE id = :id"),
            {"st": signing_token, "id": contract_id},
        )
        await db.commit()

    base_url = _get_base_url(request)
    signing_url = f"{base_url}/contract/sign/{signing_token}"

    # 3. Load associated lead for customer details
    lead_row = None
    client_row = None
    if contract["lead_id"]:
        lead_res = await db.execute(
            text("SELECT * FROM leads WHERE id = :id"),
            {"id": contract["lead_id"]},
        )
        lead_row = lead_res.mappings().first()

    customer_name = (lead_row or {}).get("customer_name") or (lead_row or {}).get("full_name") or "Valued Client"

    # Also fetch the linked client record for the canonical address
    client_id = contract.get("client_id") or ((lead_row or {}).get("client_id"))
    if client_id:
        client_res = await db.execute(
            text("SELECT id, full_name, address, city, zip, phone, email FROM clients WHERE id = :id"),
            {"id": client_id},
        )
        client_row = client_res.mappings().first()

    # 4. Generate empty unsigned PDF for delivery
    stored_data = contract.get("contract_data")
    if stored_data:
        if isinstance(stored_data, str):
            contract_data = json.loads(stored_data)
        else:
            contract_data = dict(stored_data)
    else:
        contract_data = {}

    contract_data["contract_number"] = contract["contract_number"]
    contract_data["is_signed"] = False
    contract_data["client_initials"] = ""
    contract_data["client_signature_name"] = ""
    contract_data["client_signature_data"] = ""

    # Build canonical project address: prefer client 360 record over lead record
    def _build_addr(row: dict, addr_key: str = "address", city_key: str = "city", zip_key: str = "zip") -> str:
        addr = (row.get(addr_key) or "").strip()
        city = (row.get(city_key) or "").strip()
        zip_val = (row.get(zip_key) or row.get("zip") or row.get("zip_code") or "").strip()
        parts = [p.strip() for p in addr.split(",") if p.strip()]
        if city and city.lower() not in addr.lower():
            parts.append(city)
        if zip_val and zip_val not in addr:
            parts.append(zip_val)
        seen = set()
        deduped = []
        for p in parts:
            low = p.lower()
            if low not in seen:
                if low == "ca" and any("ca" in d.lower().split() for d in deduped):
                    continue
                seen.add(low)
                deduped.append(p)
        return ", ".join(deduped)

    canonical_address = ""
    if client_row:
        canonical_address = _build_addr(dict(client_row))
    if not canonical_address and lead_row:
        canonical_address = _build_addr(dict(lead_row))

    if lead_row:
        # Always overwrite project_address with the canonical (client-sourced) address
        if canonical_address:
            contract_data["project_address"] = canonical_address
        else:
            contract_data.setdefault("project_address", "")
        contract_data.setdefault("client_name", customer_name)
        contract_data.setdefault("salesperson_name", lead_row.get("salesperson_name") or "Marc Sarellano")

    # Point every contractor reference at the configured company signatory and persist the snapshot.
    await stamp_signatory_on_contract_data(db, contract_data, signature_status)
    await db.execute(
        text("UPDATE contracts SET contract_data = COALESCE(contract_data, '{}'::jsonb) || CAST(:patch AS jsonb) WHERE id = :id"),
        {
            "patch": json.dumps({
                "contractor_signatory_name": contract_data.get("contractor_signatory_name") or "",
                "contractor_signatory_title": contract_data.get("contractor_signatory_title") or "",
            }),
            "id": contract_id,
        },
    )

    try:
        pdf_bytes = await generate_contract_pdf(contract_data)
    except Exception:
        logger.exception("Contract PDF generation failed (send for signature)")
        raise HTTPException(status_code=500, detail="PDF generation failed")

    # 5. Send email with signing link and empty PDF attached
    email_result = await send_contract_email(
        to_email=payload.to_email,
        customer_name=customer_name,
        contract_number=contract["contract_number"],
        pdf_bytes=pdf_bytes,
        custom_message=payload.custom_message,
        signing_url=signing_url,
    )

    if not email_result.get("success"):
        raise HTTPException(
            status_code=502,
            detail=f"Email delivery failed: {email_result.get('error')}",
        )

    # 6. Update contract status → sent
    await db.execute(
        text("UPDATE contracts SET status = 'sent', updated_at = NOW() WHERE id = :id"),
        {"id": contract_id},
    )

    # 7. Advance lead pipeline stage → contract_sent
    target_lead_id = contract.get("lead_id")
    if not target_lead_id and contract.get("client_id"):
        lead_lookup = (await db.execute(
            text("SELECT id FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
            {"cid": contract["client_id"]}
        )).first()
        if lead_lookup:
            target_lead_id = lead_lookup[0]
            await db.execute(
                text("UPDATE contracts SET lead_id = :lid WHERE id = :id"),
                {"lid": target_lead_id, "id": contract_id}
            )

    if target_lead_id:
        await db.execute(
            text("""
                UPDATE leads
                SET pipeline_stage = 'contract_sent',
                    stage_entered_at = NOW(),
                    status = 'contract_sent',
                    updated_at = NOW()
                WHERE id = :lead_id
            """),
            {"lead_id": target_lead_id},
        )

    await db.commit()

    # 8. Audit log
    email_id = (email_result.get("data") or {}).get("id")
    await record_audit_log(
        db=db,
        action="contract.sent",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "to_email": payload.to_email,
            "email_id": email_id,
            "lead_id": contract["lead_id"],
            "signing_url": signing_url,
        },
        request=request,
    )

    return {
        "success": True,
        "email_id": email_id,
        "contract_id": contract_id,
        "signing_url": signing_url,
        "status": "sent",
    }


# ---------------------------------------------------------------------------
# POST /api/admin/contracts/{contract_id}/send-sms
# ---------------------------------------------------------------------------

@router.post("/{contract_id}/send-sms", dependencies=[Depends(require_permission("contracts.view"))])
async def send_contract_sms(
    contract_id: int,
    payload: SendContractSmsRequest,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Prepare contract signing link for SMS dispatch.
    Advances lead pipeline stage to ``contract_sent`` and returns the direct signing URL.
    """
    contract_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    signature_status = await get_signature_status(db)
    if not signature_status.get("configured"):
        raise HTTPException(status_code=409, detail=SIGNATURE_NOT_CONFIGURED_DETAIL)

    stored_data = contract.get("contract_data")
    sms_contract_data = (json.loads(stored_data) if isinstance(stored_data, str) else dict(stored_data or {}))
    await stamp_signatory_on_contract_data(db, sms_contract_data, signature_status)
    await db.execute(
        text("UPDATE contracts SET contract_data = CAST(:cd AS jsonb), updated_at = NOW() WHERE id = :id"),
        {"cd": json.dumps(sms_contract_data), "id": contract_id},
    )

    signing_token = contract.get("signing_token")
    if not signing_token:
        signing_token = secrets.token_urlsafe(24)
        await db.execute(
            text("UPDATE contracts SET signing_token = :st WHERE id = :id"),
            {"st": signing_token, "id": contract_id},
        )
    await db.commit()

    base_url = _get_base_url(request)
    signing_url = f"{base_url}/contract/sign/{signing_token}"

    target_lead_id = contract.get("lead_id")
    if not target_lead_id and contract.get("client_id"):
        lead_lookup = (await db.execute(
            text("SELECT id FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
            {"cid": contract["client_id"]}
        )).first()
        if lead_lookup:
            target_lead_id = lead_lookup[0]
            await db.execute(
                text("UPDATE contracts SET lead_id = :lid WHERE id = :id"),
                {"lid": target_lead_id, "id": contract_id}
            )

    if target_lead_id:
        await db.execute(
            text("""
                UPDATE leads
                SET pipeline_stage = 'contract_sent',
                    stage_entered_at = NOW(),
                    status = 'contract_sent',
                    updated_at = NOW()
                WHERE id = :lead_id
            """),
            {"lead_id": target_lead_id},
        )
        await db.commit()

    await record_audit_log(
        db=db,
        action="contract.send_sms",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "phone": payload.phone,
            "signing_url": signing_url,
            "lead_id": contract["lead_id"],
        },
        request=request,
    )

    return {
        "success": True,
        "message": f"Signing link prepared for SMS to {payload.phone}",
        "signing_url": signing_url,
        "phone": payload.phone,
        "status": "sent",
    }


# ---------------------------------------------------------------------------
# GET /api/admin/contracts/{contract_id}/preview
# ---------------------------------------------------------------------------

@router.get("/{contract_id}/preview")
async def preview_contract(
    contract_id: int,
    version: Optional[str] = Query(None, description="Optional version to download: draft, partially_executed, fully_executed"),
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Return a redirect to the stored PDF file for browser-based preview or version-specific download.
    Supports versions: 'draft', 'partially_executed', 'fully_executed'.
    """
    contract_res = await db.execute(
        text("""
            SELECT id, contract_number, status, signed_pdf_url, contract_data,
                   client_initials, signature_name, signature_data, signature_type,
                   client_signed_at, counter_signed_at, counter_signed_by
            FROM contracts
            WHERE id = :id
        """),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    from app.services.contract_pdf_generator import (
        STATIC_UPLOADS_CONTRACTS_DIR,
        generate_contract_pdf,
        save_contract_pdf,
    )

    contract_number = (contract["contract_number"] or str(contract_id)).replace("/", "_").replace("\\", "_").replace(" ", "_")
    prefix = f"Contract_{contract_number}_"

    try:
        files = [
            f for f in os.listdir(STATIC_UPLOADS_CONTRACTS_DIR)
            if f.startswith(prefix) and f.endswith(".pdf")
        ]
    except FileNotFoundError:
        files = []

    raw_c_data = contract.get("contract_data")
    if isinstance(raw_c_data, str):
        try:
            base_c_data = json.loads(raw_c_data)
        except Exception:
            base_c_data = {}
    elif isinstance(raw_c_data, dict):
        base_c_data = dict(raw_c_data)
    else:
        base_c_data = {}

    if not base_c_data.get("contract_number"):
        base_c_data["contract_number"] = contract["contract_number"]

    if not contract.get("counter_signed_at") and (
        contract.get("status") == "draft" or not base_c_data.get("contractor_signatory_name")
    ):
        await stamp_signatory_on_contract_data(db, base_c_data)

    # 1. SPECIFIC VERSION: DRAFT
    if version == "draft":
        draft_files = [f for f in files if "_unsigned_" in f]
        if draft_files:
            draft_files.sort(
                key=lambda f: os.path.getmtime(os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, f)),
                reverse=True,
            )
            return RedirectResponse(url=f"/static/uploads/contracts/{draft_files[0]}", status_code=302)

        c_data = dict(base_c_data)
        c_data["is_signed"] = False
        c_data["signed_at"] = ""
        c_data["client_initials"] = ""
        c_data["client_signature_name"] = ""
        c_data["client_signature_data"] = ""
        c_data["is_counter_signed"] = False
        c_data["counter_signed_at"] = ""
        c_data["contractor_signature_name"] = ""
        c_data["contractor_signature_data"] = ""
        c_data["status"] = "draft"
        pdf_bytes = await generate_contract_pdf(c_data)
        pdf_url = await save_contract_pdf(c_data, contract_id, pdf_bytes=pdf_bytes)
        return RedirectResponse(url=pdf_url, status_code=302)

    # 2. SPECIFIC VERSION: PARTIALLY EXECUTED (Client signed only)
    if version == "partially_executed":
        c_data = dict(base_c_data)
        c_data["is_signed"] = True
        if contract.get("client_initials"):
            c_data["client_initials"] = contract.get("client_initials")
        if contract.get("signature_name"):
            c_data["client_signature_name"] = contract.get("signature_name")
        if contract.get("signature_data"):
            c_data["client_signature_data"] = contract.get("signature_data")
        if contract.get("signature_type"):
            c_data["client_signature_type"] = contract.get("signature_type")
        if contract.get("client_signed_at"):
            cs_date = contract.get("client_signed_at")
            c_data["signed_at"] = cs_date.strftime("%B %d, %Y") if isinstance(cs_date, datetime) else str(cs_date)
        c_data["is_counter_signed"] = False
        c_data["counter_signed_at"] = ""
        c_data["contractor_signature_name"] = ""
        c_data["contractor_signature_data"] = ""
        c_data["status"] = "client_signed"
        pdf_bytes = await generate_contract_pdf(c_data)
        pdf_url = await save_contract_pdf(c_data, contract_id, pdf_bytes=pdf_bytes)
        return RedirectResponse(url=pdf_url, status_code=302)

    # 3. SPECIFIC VERSION: FULLY EXECUTED (Both parties signed)
    if version == "fully_executed":
        signed_url = contract.get("signed_pdf_url")
        if signed_url:
            fname = os.path.basename(signed_url)
            fpath = os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, fname)
            if os.path.exists(fpath):
                return RedirectResponse(url=signed_url, status_code=302)

        c_data = dict(base_c_data)
        c_data["is_signed"] = True
        c_data["is_counter_signed"] = True
        if contract.get("client_initials"):
            c_data["client_initials"] = contract.get("client_initials")
        if contract.get("signature_name"):
            c_data["client_signature_name"] = contract.get("signature_name")
        if contract.get("signature_data"):
            c_data["client_signature_data"] = contract.get("signature_data")
        if contract.get("signature_type"):
            c_data["client_signature_type"] = contract.get("signature_type")
        if contract.get("counter_signed_at"):
            c_date = contract.get("counter_signed_at")
            c_data["counter_signed_at"] = c_date.strftime("%B %d, %Y") if isinstance(c_date, datetime) else str(c_date)
        c_data["status"] = "signed"
        pdf_bytes = await generate_contract_pdf(c_data)
        pdf_url = await save_contract_pdf(c_data, contract_id, pdf_bytes=pdf_bytes)
        return RedirectResponse(url=pdf_url, status_code=302)

    # 4. DEFAULT: Latest / current status version
    signed_url = contract.get("signed_pdf_url")
    if signed_url:
        fname = os.path.basename(signed_url)
        fpath = os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, fname)
        if os.path.exists(fpath):
            return RedirectResponse(url=signed_url, status_code=302)

    if files:
        if contract.get("status") in ("signed", "client_signed"):
            signed_files = [f for f in files if "_signed_" in f]
            if signed_files:
                files = signed_files
        files.sort(
            key=lambda f: os.path.getmtime(os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, f)),
            reverse=True,
        )
        return RedirectResponse(url=f"/static/uploads/contracts/{files[0]}", status_code=302)

    # If no file exists yet on disk, render on the fly from contract data
    pdf_bytes = await generate_contract_pdf(base_c_data)
    pdf_url = await save_contract_pdf(base_c_data, contract_id, pdf_bytes=pdf_bytes)
    return RedirectResponse(url=pdf_url, status_code=302)


# ---------------------------------------------------------------------------
# GET /api/admin/contracts/by-lead/{lead_id}
# ---------------------------------------------------------------------------

@router.get("/by-lead/{lead_id}")
async def get_contracts_by_lead(
    lead_id: int,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Return all contracts associated with a given lead, ordered newest-first.
    """
    res = await db.execute(
        text("""
            SELECT id, lead_id, estimate_id, client_id, contract_number,
                   status, client_signed_at, counter_signed_at, created_at, updated_at
            FROM contracts
            WHERE lead_id = :lead_id
            ORDER BY created_at DESC
        """),
        {"lead_id": lead_id},
    )
    rows = [dict(r._mapping) for r in res.fetchall()]

    # Serialize datetimes to ISO strings for JSON compatibility
    for row in rows:
        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()

    return {"contracts": rows, "total": len(rows)}


# ---------------------------------------------------------------------------
# GET /api/admin/contracts/draft-by-lead/{lead_id}
# ---------------------------------------------------------------------------

@router.get("/draft-by-lead/{lead_id}")
async def get_draft_by_lead(
    lead_id: int,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Return the single active unarchived draft contract for a lead, if one exists.
    Also checks contracts associated with the lead's client_id.
    """
    lead_res = await db.execute(
        text("SELECT id, client_id, created_by_user_id, assigned_to_user_id FROM leads WHERE id = :lead_id"),
        {"lead_id": lead_id},
    )
    lead_row = lead_res.mappings().first()
    if lead_row:
        if not check_resource_access(
            current_user,
            "leads:view",
            creator_id=lead_row.get("created_by_user_id"),
            assigned_id=lead_row.get("assigned_to_user_id"),
        ):
            raise HTTPException(status_code=403, detail="Forbidden: You do not have access to this lead's contracts")

    client_id = lead_row.get("client_id") if lead_row else None

    conditions = ["c.lead_id = :lead_id"]
    params = {"lead_id": lead_id}
    if client_id:
        conditions.append("c.client_id = :client_id")
        params["client_id"] = client_id

    res = await db.execute(
        text(f"""
            SELECT c.id, c.lead_id, c.estimate_id, c.client_id, c.contract_number,
                   c.status, c.signing_token, c.contract_data, c.is_archived,
                   c.created_at, c.updated_at,
                   l.full_name AS customer_name, l.phone AS customer_phone, l.email AS customer_email,
                   l.address AS customer_address, l.city AS customer_city, l.service_type,
                   l.estimated_value, l.assigned_to, l.pipeline_stage
            FROM contracts c
            LEFT JOIN leads l ON c.lead_id = l.id
            WHERE ({" OR ".join(conditions)})
              AND c.status = 'draft' AND c.is_archived = false
            ORDER BY c.updated_at DESC
            LIMIT 1
        """),
        params,
    )
    row = res.mappings().first()
    if not row:
        return {"exists": False, "contract": None}

    c_dict = dict(row)
    if not has_permission(current_user, "contracts.edit"):
        c_dict.pop("signing_token", None)

    raw_cd = c_dict.get("contract_data")
    if isinstance(raw_cd, str):
        try:
            c_dict["contract_data"] = json.loads(raw_cd)
        except Exception:
            c_dict["contract_data"] = {}
    elif raw_cd is None:
        c_dict["contract_data"] = {}

    for k, v in c_dict.items():
        if isinstance(v, datetime):
            c_dict[k] = v.isoformat()
    return {"exists": True, "contract": c_dict}


# ---------------------------------------------------------------------------
# GET /api/admin/contracts/draft-by-client/{client_id}
# ---------------------------------------------------------------------------

@router.get("/draft-by-client/{client_id}")
async def get_draft_by_client(
    client_id: int,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Return the single active unarchived draft contract for a client, if one exists.
    Checks contracts with matching client_id OR matching lead that belongs to this client.
    """
    res = await db.execute(
        text("""
            SELECT c.id, c.lead_id, c.estimate_id, c.client_id, c.contract_number,
                   c.status, c.signing_token, c.contract_data, c.is_archived,
                   c.created_at, c.updated_at,
                   l.full_name AS customer_name, l.phone AS customer_phone, l.email AS customer_email,
                   l.address AS customer_address, l.city AS customer_city, l.service_type,
                   l.estimated_value, l.assigned_to, l.pipeline_stage
            FROM contracts c
            LEFT JOIN leads l ON c.lead_id = l.id
            WHERE (c.client_id = :client_id OR l.client_id = :client_id)
              AND c.status = 'draft' AND c.is_archived = false
            ORDER BY c.updated_at DESC
            LIMIT 1
        """),
        {"client_id": client_id},
    )
    row = res.mappings().first()
    if not row:
        return {"exists": False, "contract": None}

    c_dict = dict(row)
    if not has_permission(current_user, "contracts.edit"):
        c_dict.pop("signing_token", None)

    raw_cd = c_dict.get("contract_data")
    if isinstance(raw_cd, str):
        try:
            c_dict["contract_data"] = json.loads(raw_cd)
        except Exception:
            c_dict["contract_data"] = {}
    elif raw_cd is None:
        c_dict["contract_data"] = {}

    for k, v in c_dict.items():
        if isinstance(v, datetime):
            c_dict[k] = v.isoformat()
    return {"exists": True, "contract": c_dict}


# ---------------------------------------------------------------------------
# GET /api/admin/contracts/{contract_id}
# ---------------------------------------------------------------------------

@router.get("/{contract_id}")
async def get_contract_by_id(
    contract_id: int,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Return a single contract record including parsed contract_data.
    """
    res = await db.execute(
        text("""
            SELECT c.id, c.contract_number,
                   CASE
                       WHEN c.counter_signed_at IS NOT NULL THEN 'signed'
                       WHEN c.client_signed_at IS NOT NULL THEN 'client_signed'
                       ELSE c.status
                   END AS status,
                   c.is_archived, c.client_signed_at, c.counter_signed_at,
                   c.signed_pdf_url, c.client_initials, c.signature_name,
                   c.signature_data, c.signature_type,
                   c.created_at, c.updated_at, c.lead_id, c.client_id, c.estimate_id, c.job_id,
                   c.signing_token, c.contract_data,
                   l.full_name AS customer_name, l.phone AS customer_phone, l.email AS customer_email,
                   l.address AS customer_address, l.city AS customer_city, l.service_type,
                   l.estimated_value, l.assigned_to, l.pipeline_stage
            FROM contracts c
            LEFT JOIN leads l ON (c.lead_id = l.id OR (c.lead_id IS NULL AND c.client_id IS NOT NULL AND c.client_id = l.client_id))
            WHERE c.id = :id
        """),
        {"id": contract_id},
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    c_dict = dict(row)
    if not has_permission(current_user, "contracts.edit"):
        c_dict.pop("signing_token", None)

    raw_cd = c_dict.get("contract_data")
    if isinstance(raw_cd, str):
        try:
            c_dict["contract_data"] = json.loads(raw_cd)
        except Exception:
            c_dict["contract_data"] = {}
    elif raw_cd is None:
        c_dict["contract_data"] = {}

    for k, v in c_dict.items():
        if isinstance(v, datetime):
            c_dict[k] = v.isoformat()

    return {"contract": c_dict}


# ---------------------------------------------------------------------------
# PUT /api/admin/contracts/{contract_id}/draft
# ---------------------------------------------------------------------------

@router.put("/{contract_id}/draft", dependencies=[Depends(require_permission("contracts.edit"))])
async def autosave_contract_draft(
    contract_id: int,
    payload: AutoSaveDraftRequest,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Lightweight debounced auto-save for contracts. Updates contract_data JSONB
    without triggering slow PDF rendering. Only editable while the contract is a draft.
    """
    res = await db.execute(
        text("SELECT id, status, version, client_initials, signature_name, signature_type, signature_data, client_signed_at, contract_data FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    if contract.get("client_signed_at") or contract.get("status") in ("client_signed", "signed"):
        raise HTTPException(
            status_code=409,
            detail="Contract has already been signed and draft changes can no longer be autosaved."
        )

    if contract.get("status") not in ("draft", "action_required"):
        raise HTTPException(
            status_code=409,
            detail="Contract has already been sent and can no longer be edited."
        )

    saved_data = format_contract_data(dict(payload.contract_data))
    await stamp_signatory_on_contract_data(db, saved_data)
    if contract.get("client_initials") and not saved_data.get("client_initials"):
        saved_data["client_initials"] = contract.get("client_initials")
    if contract.get("signature_name") and not saved_data.get("client_signature_name"):
        saved_data["client_signature_name"] = contract.get("signature_name")
    if contract.get("signature_data") and not saved_data.get("client_signature_data"):
        saved_data["client_signature_data"] = contract.get("signature_data")
    if contract.get("signature_type") and not saved_data.get("client_signature_type"):
        saved_data["client_signature_type"] = contract.get("signature_type")

    updated = (await db.execute(
        text("""
            UPDATE contracts
            SET contract_data = :contract_data,
                version = COALESCE(version, 1) + 1,
                updated_at = NOW()
            WHERE id = :id AND status IN ('draft', 'action_required')
            RETURNING version
        """),
        {
            "contract_data": json.dumps(saved_data),
            "id": contract_id,
        },
    )).mappings().first()
    if not updated:
        raise HTTPException(status_code=409, detail="Contract can no longer be edited.")
    await db.commit()
    return {"ok": True, "contract_id": contract_id, "version": updated["version"]}


# ---------------------------------------------------------------------------
# DELETE /api/admin/contracts/{contract_id}
# ---------------------------------------------------------------------------

@router.delete("/{contract_id}", dependencies=[Depends(require_permission("contracts.void"))])
async def delete_contract(
    contract_id: int,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Delete a contract draft. Only draft contracts can be hard-deleted.
    Executed/sent contracts must be archived instead.
    """
    res = await db.execute(
        text("SELECT id, contract_number, status, lead_id FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    if contract["status"] != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete a contract with status '{contract['status']}'. Only drafts can be deleted. Please archive this contract instead."
        )

    await db.execute(text("DELETE FROM contracts WHERE id = :id"), {"id": contract_id})
    await db.commit()

    await record_audit_log(
        db=db,
        action="contract.delete",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={"contract_number": contract["contract_number"], "lead_id": contract["lead_id"]},
        request=request,
    )
    return {"ok": True, "deleted_id": contract_id}


# ---------------------------------------------------------------------------
# PATCH /api/admin/contracts/{contract_id}/archive & unarchive
# ---------------------------------------------------------------------------

@router.patch("/{contract_id}/archive", dependencies=[Depends(require_permission("contracts.void"))])
async def archive_contract(
    contract_id: int,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Archive a contract (soft archive) so it no longer clutters active tables.
    """
    res = await db.execute(
        text("SELECT id, contract_number, lead_id FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    await db.execute(
        text("UPDATE contracts SET is_archived = true, updated_at = NOW() WHERE id = :id"),
        {"id": contract_id},
    )
    await db.commit()

    await record_audit_log(
        db=db,
        action="contract.archive",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={"is_archived": True},
        request=request,
    )
    return {"ok": True, "contract_id": contract_id, "is_archived": True}


@router.patch("/{contract_id}/unarchive", dependencies=[Depends(require_permission("contracts.void"))])
async def unarchive_contract(
    contract_id: int,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Unarchive a previously archived contract, returning it to active tables.
    """
    res = await db.execute(
        text("SELECT id, contract_number, lead_id FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    await db.execute(
        text("UPDATE contracts SET is_archived = false, updated_at = NOW() WHERE id = :id"),
        {"id": contract_id},
    )
    await db.commit()

    await record_audit_log(
        db=db,
        action="contract.unarchive",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={"is_archived": False},
        request=request,
    )
    return {"ok": True, "contract_id": contract_id, "is_archived": False}



# ---------------------------------------------------------------------------
# PATCH /api/admin/contracts/{contract_id}/sign
# ---------------------------------------------------------------------------

@router.patch("/{contract_id}/sign", dependencies=[Depends(require_permission("contracts.view"))])
async def sign_contract(
    contract_id: int,
    payload: SignContractRequest,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a contract as client-signed.

    Updates:
    - ``contracts.client_signed_at`` → now()
    - ``contracts.status`` → ``'signed'``
    - ``leads.pipeline_stage`` → ``'contract_signed'``
    - ``leads.stage_entered_at`` → now()

    Returns the updated contract record.
    """
    # 1. Load contract
    contract_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    # 2. Update contract
    now_ts = datetime.now(timezone.utc)
    await db.execute(
        text("""
            UPDATE contracts
            SET status = 'signed',
                client_signed_at = :signed_at,
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": contract_id, "signed_at": now_ts},
    )

    # 3. Update lead pipeline stage
    target_lead_id = contract.get("lead_id")
    if not target_lead_id and contract.get("client_id"):
        lead_lookup = (await db.execute(
            text("SELECT id FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
            {"cid": contract["client_id"]}
        )).first()
        if lead_lookup:
            target_lead_id = lead_lookup[0]
            await db.execute(
                text("UPDATE contracts SET lead_id = :lid WHERE id = :id"),
                {"lid": target_lead_id, "id": contract_id}
            )

    if target_lead_id:
        await db.execute(
            text("""
                UPDATE leads
                SET pipeline_stage = 'contract_signed',
                    stage_entered_at = NOW(),
                    contract_signed_at = :signed_at,
                    status = 'won',
                    updated_at = NOW()
                WHERE id = :lead_id
            """),
            {"lead_id": target_lead_id, "signed_at": now_ts},
        )

    await db.commit()

    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass

    # 4. Audit log
    await record_audit_log(
        db=db,
        action="contract.signed",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "signed_by": payload.signed_by,
            "signed_at": now_ts.isoformat(),
            "lead_id": contract["lead_id"],
        },
        request=request,
    )

    # 5. Return updated contract
    updated_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    updated = dict(updated_res.mappings().first())
    for k, v in updated.items():
        if isinstance(v, datetime):
            updated[k] = v.isoformat()

    return {"contract": updated, "status": "signed"}


# ---------------------------------------------------------------------------
# POST /api/admin/contracts/{contract_id}/counter-sign
# ---------------------------------------------------------------------------

@router.post("/{contract_id}/counter-sign", dependencies=[Depends(require_permission("contracts.view"))])
async def counter_sign_contract(
    contract_id: int,
    request: Request,
    payload: Optional[CounterSignContractRequest] = Body(default=None),
    current_user=Depends(require_signature_access("use")),
    db: AsyncSession = Depends(get_db),
):
    """
    Contractor counter-signs a contract, transitioning it from 1-Party Signed ('client_signed')
    to Fully Executed ('signed').

    The contractor signature is always the single company signature (configured in
    Settings → Company Signature). Any user whose role grants signature access 'use' (or higher)
    may apply it; the applying user is recorded as ``counter_signed_by``.

    Actions executed:
    1. Sets contracts.status → 'signed'
    2. Sets contracts.counter_signed_at → now() and counter_signed_by → current_user.id
    3. Merges the company signature into contract_data and compiles the final executed PDF
    4. Advances leads.pipeline_stage → 'contract_signed', contract_signed_at → now(), status → 'won'
    5. Sends transactional email with the final executed PDF attached to the homeowner
    6. Dispatches SMS with direct download link for the executed PDF
    7. Logs audit trail and system activity
    """
    # 1. Load contract
    contract_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    # If already fully executed with counter-signature, return existing document
    if contract["status"] == "signed" and contract.get("counter_signed_at"):
        return {
            "success": True,
            "message": "Contract was already counter-signed and fully executed.",
            "contract_id": contract_id,
            "status": "signed",
            "pdf_url": contract.get("signed_pdf_url"),
        }

    # The company contractor signature must be configured before anyone can counter-sign.
    company_signature = await get_current_signature(db)
    if not company_signature or not (company_signature.get("signature_data") or "").strip():
        raise HTTPException(status_code=409, detail=SIGNATURE_NOT_CONFIGURED_DETAIL)

    # 2. Load stored contract data
    stored_data = contract.get("contract_data")
    if stored_data:
        contract_data = json.loads(stored_data) if isinstance(stored_data, str) else dict(stored_data)
    else:
        contract_data = {}

    now_ts = datetime.now(timezone.utc)
    formatted_date = now_ts.strftime("%B %d, %Y")

    signatory_name = (company_signature.get("signer_name") or "").strip()
    signatory_title = (company_signature.get("signer_title") or "").strip()
    signature_version = company_signature.get("version")
    applied_by_name = (getattr(current_user, "name", None) or current_user.email or "").strip()
    signatory_user_id = current_user.id

    cnum = contract.get("contract_number") or f"RU-{contract_id}"

    # Merge the company signature into contract_data.
    # NOTE: ``contractor_name`` is the company name — it is intentionally left untouched.
    await stamp_signatory_on_contract_data(db, contract_data, company_signature)
    contract_data["contractor_signatory_name"] = signatory_name
    contract_data["contractor_signatory_title"] = signatory_title
    contract_data["contract_number"] = cnum
    contract_data["is_signed"] = True
    contract_data["is_counter_signed"] = True
    contract_data["contractor_title"] = signatory_title
    contract_data["contractor_signature_data"] = company_signature.get("signature_data")
    contract_data["contractor_signature_type"] = company_signature.get("signature_type") or "typed"
    contract_data["contractor_signature_name"] = signatory_name
    contract_data["contractor_signature_version"] = signature_version
    contract_data["counter_signed_by_name"] = applied_by_name
    contract_data["counter_signed_at"] = formatted_date
    if not contract_data.get("signed_at"):
        contract_data["signed_at"] = formatted_date

    # Ensure client initials and signatures from DB record are preserved in contract_data
    if contract.get("client_initials"):
        contract_data["client_initials"] = contract.get("client_initials")
    if contract.get("signature_name"):
        contract_data["client_signature_name"] = contract.get("signature_name")
    if contract.get("signature_data"):
        contract_data["client_signature_data"] = contract.get("signature_data")
    if contract.get("signature_type"):
        contract_data["client_signature_type"] = contract.get("signature_type")
    if contract.get("client_signed_at"):
        cs_date = contract.get("client_signed_at")
        if isinstance(cs_date, datetime):
            contract_data["signed_at"] = cs_date.strftime("%B %d, %Y")
        elif isinstance(cs_date, str):
            contract_data["signed_at"] = cs_date

    # 3. Generate final executed PDF
    try:
        pdf_bytes = await generate_contract_pdf(contract_data)
        final_pdf_url = await save_contract_pdf(contract_data, contract_id, pdf_bytes=pdf_bytes)
    except Exception:
        logger.exception("Executed contract PDF generation failed (contract_id=%s)", contract_id)
        raise HTTPException(status_code=500, detail="Executed PDF generation failed")

    # 4. Update contract record in DB
    await db.execute(
        text("""
            UPDATE contracts
            SET status = 'signed',
                counter_signed_at = :counter_signed_at,
                counter_signed_by = :counter_signed_by,
                signed_pdf_url = :pdf_url,
                contract_data = :contract_data,
                updated_at = NOW()
            WHERE id = :id
        """),
        {
            "id": contract_id,
            "counter_signed_at": now_ts,
            "counter_signed_by": signatory_user_id,
            "pdf_url": final_pdf_url,
            "contract_data": json.dumps(contract_data),
        },
    )

    # 5. Advance lead pipeline stage to 'contract_signed' and mark 'won'
    target_lead_id = contract.get("lead_id")
    if not target_lead_id and contract.get("client_id"):
        lead_lookup = (await db.execute(
            text("SELECT id FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
            {"cid": contract["client_id"]}
        )).first()
        if lead_lookup:
            target_lead_id = lead_lookup[0]
            await db.execute(
                text("UPDATE contracts SET lead_id = :lid WHERE id = :id"),
                {"lid": target_lead_id, "id": contract_id}
            )

    lead_row = None
    if target_lead_id:
        await db.execute(
            text("""
                UPDATE leads
                SET pipeline_stage = 'contract_signed',
                    stage_entered_at = NOW(),
                    contract_signed_at = COALESCE(contract_signed_at, :now_ts),
                    status = 'won',
                    updated_at = NOW()
                WHERE id = :lead_id
            """),
            {"lead_id": target_lead_id, "now_ts": now_ts},
        )
        lead_res = await db.execute(
            text("SELECT * FROM leads WHERE id = :id"),
            {"id": target_lead_id},
        )
        lead_row = lead_res.mappings().first()

    # 6. Contact and delivery info
    customer_name = (lead_row or {}).get("customer_name") or (lead_row or {}).get("full_name") or contract_data.get("client_name") or "Valued Client"
    customer_email = (lead_row or {}).get("email") or contract_data.get("client_email")
    customer_phone = (lead_row or {}).get("phone") or contract_data.get("client_phone")
    base_url = _get_base_url(request)
    download_url = f"{base_url}{final_pdf_url}"
    clean_cnum = cnum.replace("/", "_").replace(" ", "_")

    # 7. Email final executed PDF to client
    email_sent = False
    if customer_email:
        try:
            email_result = await send_contract_email(
                to_email=customer_email,
                customer_name=customer_name,
                contract_number=cnum,
                pdf_bytes=pdf_bytes,
                pdf_filename=f"Fully_Executed_Contract_{clean_cnum}.pdf",
                subject=f"Fully Executed Contract – Rise Up Roofing ({cnum})",
                custom_message="Congratulations! Your Home Improvement Contract has been counter-signed and fully executed by Rise Up Roofing & Construction. Attached is your official copy for your permanent records.",
                signing_url=None,
            )
            email_sent = bool(email_result.get("success"))
        except Exception as e:
            logger.warning(f"Email delivery notice: {e}")

    # 8. Send SMS with download link to client
    sms_sent = False
    if customer_phone:
        sms_text = f"Rise Up Roofing: Hi {customer_name}, your contract {cnum} has been counter-signed and is fully executed! Download your official PDF here: {download_url}"
        logger.info(f"To: {customer_phone} -> {sms_text}")
        sms_sent = True

    # 9. Record system activity
    if contract["lead_id"]:
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
                VALUES ('lead', :lid, :cid, 'contract_counter_signed', 'Contract Fully Executed & Counter-Signed', :desc, :user_name, NOW())
            """),
            {
                "lid": target_lead_id,
                "cid": contract.get("client_id"),
                "desc": f"Contract {cnum} counter-signed with {signatory_name}'s signature ({signatory_title}, Lic #1096492), applied by {applied_by_name}. Final PDF emailed to {customer_email or 'client'} and SMS sent to {customer_phone or 'client'}.",
                "user_name": applied_by_name or "Company Admin",
            },
        )

    # 10. Audit log
    await record_audit_log(
        db=db,
        action="contract.counter_signed",
        resource_type="contract",
        resource_id=contract_id,
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        changes={
            "counter_signed_by": current_user.id,
            "applied_by": applied_by_name,
            "contractor_signatory_name": signatory_name,
            "contractor_signatory_title": signatory_title,
            "company_signature_version": signature_version,
            "counter_signed_at": now_ts.isoformat(),
            "pdf_url": final_pdf_url,
            "email_sent": email_sent,
            "sms_sent": sms_sent,
            "lead_id": target_lead_id,
        },
        request=request,
    )

    await db.commit()

    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass

    # 11. Return updated contract
    updated_res = await db.execute(
        text("SELECT * FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    updated = dict(updated_res.mappings().first())
    for k, v in updated.items():
        if isinstance(v, datetime):
            updated[k] = v.isoformat()

    return {
        "success": True,
        "message": f"Contract {cnum} counter-signed and fully executed successfully.",
        "contract": updated,
        "pdf_url": final_pdf_url,
        "email_sent": email_sent,
        "sms_sent": sms_sent,
        "customer_phone": customer_phone,
        "download_url": download_url,
        "status": "signed",
        "signed_with_version": signature_version,
        "contractor_signatory_name": signatory_name,
        "contractor_signatory_title": signatory_title,
    }
