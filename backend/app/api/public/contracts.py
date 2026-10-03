"""
Public Contract Portal & Electronic Signing Routes
===================================================
Public endpoints for homeowners to view, initial, and sign contracts without login.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.logger import get_logger
from app.services.contract_pdf_generator import generate_contract_pdf, save_contract_pdf
from app.schemas.contracts import PublicSignContractRequest

logger = get_logger(__name__)
router = APIRouter(tags=["Public Contracts Portal"])


@router.get("/api/contract/{token}")
async def get_public_contract(token: str, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint for homeowner contract signing wizard.
    Retrieves project details, scope of work, progress payment milestones,
    and statutory disclosures.
    """
    if len(token) < 8:
        raise HTTPException(status_code=404, detail="Contract not found or invalid link")

    sql = text("""
        SELECT c.*, l.full_name as lead_name, l.phone as lead_phone, l.email as lead_email,
               l.address as lead_address, l.city as lead_city
        FROM contracts c
        LEFT JOIN leads l ON c.lead_id = l.id
        WHERE c.signing_token = :token AND c.signing_token IS NOT NULL
        LIMIT 1
    """)
    res = (await db.execute(sql, {"token": token})).mappings().first()
    if not res:
        raise HTTPException(status_code=404, detail="Contract not found or signing link has expired")

    row = dict(res)
    raw_data = row.get("contract_data")
    if raw_data:
        contract_data = json.loads(raw_data) if isinstance(raw_data, str) else dict(raw_data)
    else:
        contract_data = {}

    is_signed = row.get("status") in ("signed", "client_signed") or bool(row.get("client_signed_at"))
    is_counter_signed = bool(
        row.get("counter_signed_at")
        or (row.get("status") == "signed" and contract_data.get("is_counter_signed"))
    )

    public_contract = {
        "id": row["id"],
        "contractNumber": row.get("contract_number") or f"RU-{row['id']}",
        "status": row.get("status", "draft"),
        "signingToken": row.get("signing_token"),
        "isSigned": is_signed,
        "signedAt": row["client_signed_at"].isoformat() if row.get("client_signed_at") else None,
        "signedPdfUrl": row.get("signed_pdf_url"),
        "isCounterSigned": is_counter_signed,
        "counterSignedAt": row["counter_signed_at"].isoformat() if row.get("counter_signed_at") else (contract_data.get("counter_signed_at") or None),
        "clientName": contract_data.get("client_name") or row.get("lead_name") or "",
        "clientEmail": row.get("lead_email") or contract_data.get("client_email") or "",
        "clientPhone": row.get("lead_phone") or contract_data.get("client_phone") or "",
        "projectAddress": contract_data.get("project_address") or row.get("lead_address") or "",
        "contractDate": contract_data.get("contract_date") or (row["created_at"].strftime("%B %d, %Y") if row.get("created_at") else datetime.now(timezone.utc).strftime("%B %d, %Y")),
        "contractorName": contract_data.get("contractor_name") or "",
        "contractorLicense": contract_data.get("contractor_license") or "",
        "salespersonName": contract_data.get("salesperson_name") or row.get("lead_salesperson") or "",
        "approxStartDate": contract_data.get("start_date") or "",
        "substantialCommencementDate": contract_data.get("commencement_date") or "",
        "approxCompletionDate": contract_data.get("completion_date") or "",
        "scopeTitle": contract_data.get("scope_title") or "",
        "scopeIntro": contract_data.get("scope_intro") or "",
        "scopeSections": contract_data.get("scope_sections") or [],
        "contractPrice": contract_data.get("contract_price") or "",
        "downpayment": contract_data.get("downpayment") or "",
        "financeCharge": contract_data.get("finance_charge") or "N/A",
        "paymentSchedule": contract_data.get("payment_schedule") or [],
        "insuranceCarrier": contract_data.get("insurance_carrier") or "",
        "insurancePhone": contract_data.get("insurance_phone") or "",
        "workersCompCarrier": contract_data.get("workers_comp_carrier") or "",
        "workersCompPhone": contract_data.get("workers_comp_phone") or "",
        "cancellationEmail": contract_data.get("cancellation_email") or "",
        "statutoryAcknowledgments": contract_data.get("statutory_acknowledgments"),
    }

    return {"contract": public_contract}


@router.post("/api/contract/{token}/sign")
async def sign_public_contract(
    token: str,
    payload: PublicSignContractRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public electronic execution endpoint.
    Verifies client initials, CSLB statutory acknowledgments, and signature,
    renders the signed & initialed PDF, updates contract status to 'client_signed',
    and records contract signing activity.
    """
    if len(token) < 8:
        raise HTTPException(status_code=404, detail="Contract not found")

    sql = text("""
        SELECT * FROM contracts
        WHERE signing_token = :token AND signing_token IS NOT NULL
        LIMIT 1
    """)
    contract_res = (await db.execute(sql, {"token": token})).mappings().first()
    if not contract_res:
        raise HTTPException(status_code=404, detail="Contract not found or expired")

    contract = dict(contract_res)
    contract_id = contract["id"]

    # If already signed, reject with 409 Conflict (CAS/optimistic-lock semantics)
    if contract.get("status") in ("signed", "client_signed") and contract.get("signed_pdf_url"):
        already_signed_at = (
            (contract["client_signed_at"].isoformat() if hasattr(contract["client_signed_at"], "isoformat") else str(contract["client_signed_at"]))
            if contract.get("client_signed_at") else None
        )
        raise HTTPException(
            status_code=409,
            detail=f"This contract has already been signed. Signed at: {already_signed_at}",
        )

    # Load stored contract template data
    raw_data = contract.get("contract_data")
    if raw_data:
        contract_data = json.loads(raw_data) if isinstance(raw_data, str) else dict(raw_data)
    else:
        contract_data = {}

    client_ip = request.client.host if request.client else "unknown"
    now_ts = datetime.now(timezone.utc)
    formatted_date = now_ts.strftime("%B %d, %Y")

    effective_name = (payload.signer_name or payload.signature_name).strip()
    effective_sig = (payload.signature_svg or payload.signature_data or payload.signature_name).strip()

    # Persist statutory acknowledgments under California CSLB BPC 7159
    statutory_ack = {
        "agreed_scope": payload.agreed_scope,
        "agreed_milestones": payload.agreed_milestones,
        "agreed_refund": payload.agreed_refund,
        "agreed_disclosures": payload.agreed_disclosures,
        "agreed_cancellation": payload.agreed_cancellation,
        "compliance_reference": "CSLB BPC 7159",
        "acknowledged_at": now_ts.isoformat(),
        "signer_name": effective_name,
        "signer_ip": client_ip,
    }

    # Merge signing values and statutory metadata into contract_data
    contract_data["contract_number"] = contract.get("contract_number") or f"RU-{contract_id}"
    contract_data["is_signed"] = True
    contract_data["signed_at"] = formatted_date
    contract_data["client_initials"] = payload.client_initials.strip().upper()
    contract_data["client_signature_name"] = effective_name
    contract_data["client_signature_type"] = payload.signature_type
    contract_data["client_signature_data"] = effective_sig
    if payload.signature_svg:
        contract_data["signature_svg"] = payload.signature_svg
    contract_data["is_senior_citizen"] = payload.is_senior_citizen
    contract_data["statutory_acknowledgments"] = statutory_ack
    contract_data["agreed_scope"] = payload.agreed_scope
    contract_data["agreed_milestones"] = payload.agreed_milestones
    contract_data["agreed_refund"] = payload.agreed_refund
    contract_data["agreed_disclosures"] = payload.agreed_disclosures
    contract_data["agreed_cancellation"] = payload.agreed_cancellation

    # Generate the Signed & Initialed PDF via Playwright
    try:
        signed_pdf_url = await save_contract_pdf(contract_data, contract_id)
    except Exception:
        logger.exception("Signed contract PDF generation failed (contract_id=%s)", contract_id)
        raise HTTPException(status_code=500, detail="Signed PDF generation failed")

    # Update contract in DB: Mark as 1-Party Signed ('client_signed')
    await db.execute(
        text("""
            UPDATE contracts
            SET status = 'client_signed',
                client_signed_at = :signed_at,
                client_initials = :initials,
                signature_name = :sig_name,
                signature_type = :sig_type,
                signature_data = :sig_data,
                signed_pdf_url = :pdf_url,
                signed_ip = :signed_ip,
                contract_data = :contract_data,
                version = COALESCE(version, 1) + 1,
                updated_at = NOW()
            WHERE id = :id AND (status NOT IN ('signed', 'client_signed') OR status IS NULL)
        """),
        {
            "id": contract_id,
            "signed_at": now_ts,
            "initials": payload.client_initials.strip().upper(),
            "sig_name": effective_name,
            "sig_type": payload.signature_type,
            "sig_data": effective_sig,
            "pdf_url": signed_pdf_url,
            "signed_ip": client_ip,
            "contract_data": json.dumps(contract_data),
        },
    )

    # Advance lead from contract_sent to contract_signed
    lead_id = contract.get("lead_id")
    if not lead_id and contract.get("client_id"):
        lead_row = (await db.execute(
            text("SELECT id FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
            {"cid": contract["client_id"]}
        )).first()
        if lead_row:
            lead_id = lead_row[0]
            await db.execute(
                text("UPDATE contracts SET lead_id = :lid WHERE id = :id"),
                {"lid": lead_id, "id": contract_id}
            )

    if lead_id:
        await db.execute(
            text("""
                UPDATE leads
                SET pipeline_stage = 'contract_signed',
                    stage_entered_at = NOW(),
                    contract_signed_at = COALESCE(contract_signed_at, :signed_at),
                    status = 'won',
                    updated_at = NOW()
                WHERE id = :lead_id
            """),
            {"lead_id": lead_id, "signed_at": now_ts},
        )
        if contract.get("estimate_id"):
            await db.execute(
                text("UPDATE estimates SET status = 'accepted', updated_at = NOW() WHERE id = :eid"),
                {"eid": contract["estimate_id"]},
            )

        cnum = contract.get("contract_number") or f"RU-{contract_id}"
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
                VALUES ('lead', :lid, :cid, 'contract_client_signed', 'Contract Signed: Awaiting Contractor Counter-Signature', :desc, 'Customer', NOW())
            """),
            {
                "lid": lead_id,
                "cid": contract.get("client_id"),
                "desc": f"Homeowner {effective_name} electronically signed & initialed contract {cnum} via digital signing wizard with CSLB statutory acknowledgments (BPC 7159). Moved to Contract Signed. IP: {client_ip}",
            },
        )

    await db.commit()

    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass

    return {
        "success": True,
        "message": "Contract electronically signed by client. Awaiting contractor counter-signature.",
        "contract_number": contract.get("contract_number"),
        "signed_pdf_url": signed_pdf_url,
        "signed_at": formatted_date,
    }
