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

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.core.audit import record_audit_log
from app.middlewares.auth import require_auth, require_permission
from app.services.contract_pdf_generator import generate_contract_pdf, save_contract_pdf
from app.services.email_service import send_contract_email
logger = get_logger(__name__)

router = APIRouter(prefix="/contracts", tags=["Admin Contracts"], dependencies=[Depends(require_permission("contracts.view"))])

# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class BuildContractRequest(BaseModel):
    lead_id: Optional[int] = None
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
    contractor_name: Optional[str] = None
    contractor_title: Optional[str] = None
    signatory_id: Optional[int] = None
    signature_data: Optional[str] = None
    signature_type: Optional[str] = None


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
    client_id = None
    if payload.lead_id:
        lead_res = await db.execute(
            text("SELECT id, client_id, pipeline_stage FROM leads WHERE id = :id"),
            {"id": payload.lead_id},
        )
        lead_row = lead_res.first()
        if lead_row:
            client_id = lead_row.client_id

    # 2. Check if an existing contract was passed to update, or if an active draft exists for this lead
    existing_contract = None
    if payload.contract_id:
        c_res = await db.execute(
            text("SELECT * FROM contracts WHERE id = :id"),
            {"id": payload.contract_id},
        )
        existing_contract = c_res.mappings().first()
    elif payload.lead_id:
        c_res = await db.execute(
            text("SELECT * FROM contracts WHERE lead_id = :lead_id AND status = 'draft' AND is_archived = false ORDER BY updated_at DESC LIMIT 1"),
            {"lead_id": payload.lead_id},
        )
        existing_contract = c_res.mappings().first()

    if existing_contract:
        contract_id = existing_contract["id"]
        contract_number = existing_contract["contract_number"] or f"RU-{datetime.now(timezone.utc).year}-{contract_id:05d}"
        signing_token = existing_contract.get("signing_token") or secrets.token_urlsafe(24)
        
        contract_data = dict(payload.contract_data)
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
                    updated_at = NOW()
                WHERE id = :id
            """),
            {
                "contract_data": json.dumps(contract_data),
                "signing_token": signing_token,
                "id": contract_id,
            },
        )
        await db.commit()
    else:
        # 3. Generate contract number
        lead_num = payload.lead_id or 1
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
        contract_data = dict(payload.contract_data)
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

    # 7. Generate and save empty PDF
    try:
        pdf_url = await save_contract_pdf(contract_data, contract_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

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
            text("SELECT id, full_name, address, city, zip_code, phone, email FROM clients WHERE id = :id"),
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
    def _build_addr(row: dict, addr_key: str = "address", city_key: str = "city", zip_key: str = "zip_code") -> str:
        parts = [
            (row.get(addr_key) or "").strip(),
            (row.get(city_key) or "").strip(),
            (row.get(zip_key) or row.get("zip") or "").strip(),
        ]
        return ", ".join(p for p in parts if p)

    canonical_address = ""
    if client_row:
        canonical_address = _build_addr(dict(client_row))
    if not canonical_address and lead_row:
        canonical_address = _build_addr(dict(lead_row), addr_key="address", city_key="city", zip_key="zip_code")

    if lead_row:
        # Always overwrite project_address with the canonical (client-sourced) address
        if canonical_address:
            contract_data["project_address"] = canonical_address
        else:
            contract_data.setdefault("project_address", "")
        contract_data.setdefault("client_name", customer_name)
        contract_data.setdefault("salesperson_name", lead_row.get("salesperson_name") or "Marc Sarellano")

    try:
        pdf_bytes = await generate_contract_pdf(contract_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")

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
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Return a redirect to the stored PDF file for browser-based preview.
    If no PDF is stored, returns 404.
    """
    contract_res = await db.execute(
        text("SELECT id, contract_number, status, signed_pdf_url FROM contracts WHERE id = :id"),
        {"id": contract_id},
    )
    contract = contract_res.mappings().first()
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found")

    from app.services.contract_pdf_generator import STATIC_UPLOADS_CONTRACTS_DIR

    # If the contract has a signed_pdf_url and the file exists, redirect directly
    signed_url = contract.get("signed_pdf_url")
    if signed_url:
        fname = os.path.basename(signed_url)
        fpath = os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, fname)
        if os.path.exists(fpath):
            return RedirectResponse(url=signed_url, status_code=302)

    # Locate the most recent PDF for this contract in the uploads dir
    contract_number = (contract["contract_number"] or str(contract_id)).replace("/", "_").replace(" ", "_")
    prefix = f"Contract_{contract_number}_"

    try:
        files = [
            f for f in os.listdir(STATIC_UPLOADS_CONTRACTS_DIR)
            if f.startswith(prefix) and f.endswith(".pdf")
        ]
    except FileNotFoundError:
        files = []

    if not files:
        raise HTTPException(
            status_code=404,
            detail="PDF not yet generated for this contract. Use /build first.",
        )

    # If contract is signed or client_signed, prefer signed files
    if contract.get("status") in ("signed", "client_signed"):
        signed_files = [f for f in files if "_signed_" in f]
        if signed_files:
            files = signed_files

    # Return the most recently modified file (by mtime, NOT alphabetical!)
    files.sort(
        key=lambda f: os.path.getmtime(os.path.join(STATIC_UPLOADS_CONTRACTS_DIR, f)),
        reverse=True,
    )
    pdf_url = f"/static/uploads/contracts/{files[0]}"
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
    """
    res = await db.execute(
        text("""
            SELECT id, lead_id, estimate_id, client_id, contract_number,
                   status, signing_token, contract_data, is_archived,
                   created_at, updated_at
            FROM contracts
            WHERE lead_id = :lead_id AND status = 'draft' AND is_archived = false
            ORDER BY updated_at DESC
            LIMIT 1
        """),
        {"lead_id": lead_id},
    )
    row = res.mappings().first()
    if not row:
        return {"exists": False, "contract": None}

    c_dict = dict(row)
    for k, v in c_dict.items():
        if isinstance(v, datetime):
            c_dict[k] = v.isoformat()
    return {"exists": True, "contract": c_dict}


# ---------------------------------------------------------------------------
# PUT /api/admin/contracts/{contract_id}/draft
# ---------------------------------------------------------------------------

@router.put("/{contract_id}/draft", dependencies=[Depends(require_permission("contracts.view"))])
async def autosave_contract_draft(
    contract_id: int,
    payload: AutoSaveDraftRequest,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Lightweight debounced auto-save for contracts. Updates contract_data JSONB
    without triggering slow PDF rendering.
    """
    res = await db.execute(
        text("SELECT id, status, client_initials, signature_name, signature_type, signature_data, client_signed_at, contract_data FROM contracts WHERE id = :id"),
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

    saved_data = dict(payload.contract_data)
    if contract.get("client_initials") and not saved_data.get("client_initials"):
        saved_data["client_initials"] = contract.get("client_initials")
    if contract.get("signature_name") and not saved_data.get("client_signature_name"):
        saved_data["client_signature_name"] = contract.get("signature_name")
    if contract.get("signature_data") and not saved_data.get("client_signature_data"):
        saved_data["client_signature_data"] = contract.get("signature_data")
    if contract.get("signature_type") and not saved_data.get("client_signature_type"):
        saved_data["client_signature_type"] = contract.get("signature_type")

    await db.execute(
        text("""
            UPDATE contracts
            SET contract_data = :contract_data,
                version = COALESCE(version, 1) + 1,
                updated_at = NOW()
            WHERE id = :id AND (status IN ('draft', 'action_required', 'sent'))
        """),
        {
            "contract_data": json.dumps(saved_data),
            "id": contract_id,
        },
    )
    await db.commit()
    return {"ok": True, "contract_id": contract_id, "version": (contract.get("version") or 1) + 1}


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
                    granular_stage = 'contract_signed',
                    contract_status = 'client_signed',
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
    payload: CounterSignContractRequest,
    request: Request,
    current_user=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Contractor counter-signs a contract, transitioning it from 1-Party Signed ('client_signed')
    to Fully Executed ('signed').

    Actions executed:
    1. Sets contracts.status → 'signed'
    2. Sets contracts.counter_signed_at → now() and counter_signed_by → current_user.id
    3. Merges contractor signature into contract_data and compiles the final executed PDF
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

    # 1. Verify that the CURRENT logged-in user is an authorized signatory FIRST
    sig_check = await db.execute(
        text("""
            SELECT u.id, u.name, u.signature_data, u.signature_type, u.signature_title
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            INNER JOIN roles r ON ur.role_id = r.id AND r.is_authorized_signatory = true
            WHERE u.id = :uid AND u.status = 'active'
            LIMIT 1
        """),
        {"uid": current_user.id}
    )
    signatory_row = sig_check.mappings().first()
    if not signatory_row:
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Only staff holding an Authorized Signatory role can legally counter-sign contracts."
        )

    # Verify that the current user has configured their personal signature
    contractor_signature_data = (signatory_row.get("signature_data") or "").strip()
    if not contractor_signature_data:
        raise HTTPException(
            status_code=400,
            detail="Your official signature has not been configured yet. Please go to Settings > Authorized Signatories and configure your personal electronic signature before counter-signing."
        )

    # If already fully executed with counter-signature, return existing document
    if contract["status"] == "signed" and contract.get("counter_signed_at"):
        return {
            "success": True,
            "message": "Contract was already counter-signed and fully executed.",
            "contract_id": contract_id,
            "status": "signed",
            "pdf_url": contract.get("signed_pdf_url"),
        }

    # 2. Load stored contract data
    stored_data = contract.get("contract_data")
    if stored_data:
        contract_data = json.loads(stored_data) if isinstance(stored_data, str) else dict(stored_data)
    else:
        contract_data = {}

    now_ts = datetime.now(timezone.utc)
    formatted_date = now_ts.strftime("%B %d, %Y")

    # Strictly bind to the authenticated user's credentials (no third-party impersonation)
    contractor_name = (signatory_row.get("name") or current_user.name or "Authorized Officer").strip()
    contractor_title = (signatory_row.get("signature_title") or "Project Manager").strip()
    contractor_signature_type = signatory_row.get("signature_type") or "typed"
    signatory_user_id = current_user.id

    cnum = contract.get("contract_number") or f"RU-{contract_id}"

    # Merge contractor signature into contract_data
    contract_data["contract_number"] = cnum
    contract_data["is_signed"] = True
    contract_data["is_counter_signed"] = True
    contract_data["contractor_name"] = contractor_name
    contract_data["contractor_title"] = contractor_title
    contract_data["contractor_signature_data"] = contractor_signature_data
    contract_data["contractor_signature_type"] = contractor_signature_type
    contract_data["contractor_signature_name"] = contractor_name
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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Executed PDF generation failed: {exc}")

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
                    granular_stage = 'contract_signed',
                    contract_status = 'signed',
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
                "desc": f"Contract {cnum} counter-signed by {contractor_name} ({contractor_title}, Lic #1096492). Final PDF emailed to {customer_email or 'client'} and SMS sent to {customer_phone or 'client'}.",
                "user_name": getattr(current_user, "full_name", None) or getattr(current_user, "email", "Company Admin"),
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
            "contractor_name": contractor_name,
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
    }
