import re
from datetime import datetime
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.audit import record_audit_log
from app.services.sync import find_or_create_client, recalculate_client_stats

router = APIRouter(tags=["Proposal Portal"])

@router.get("/api/proposal/{identifier}")
async def get_public_proposal(identifier: str, db: AsyncSession = Depends(get_db)):
    # Anti-enumeration guard
    if re.match(r"^\d+$", identifier):
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    sql = text("""
        SELECT * FROM estimates
        WHERE estimate_number = :id OR access_token = :id
        LIMIT 1
    """)
    res = (await db.execute(sql, {"id": identifier})).mappings().first()
    if not res:
        raise HTTPException(status_code=404, detail="Proposal not found or link has expired")

    est = dict(res)

    # Track homeowner first view
    if not est.get("viewed_at"):
        await db.execute(text("UPDATE estimates SET viewed_at = NOW() WHERE id = :id"), {"id": est["id"]})
        if est.get("lead_id"):
            await db.execute(text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
                VALUES ('lead', :lid, :cid, 'system', 'Proposal Viewed by Homeowner', :desc, 'Customer', NOW())
            """), {
                "lid": est["lead_id"],
                "cid": est.get("client_id"),
                "desc": f"Homeowner opened digital proposal ({est['estimate_number']}) online",
            })

    # Sanitize wholesale internal margin from public response
    public_proposal = {
        "id": est["id"],
        "estimateNumber": est["estimate_number"],
        "status": est["status"],
        "customerName": est["customer_name"],
        "customerAddress": est.get("customer_address"),
        "customerCity": est.get("customer_city"),
        "customerZip": est.get("customer_zip"),
        "serviceType": est["service_type"],
        "roofSquares": float(est["roof_squares"]),
        "roofPitch": est.get("roof_pitch", "4:12"),
        "stories": est.get("stories", 1),
        "materialType": est["material_type"],
        "addons": est.get("addons") or [],
        "total": float(est["total"]),
        "financingMonths": est.get("financing_months", 60),
        "monthlyPayment": float(est["monthly_payment"]) if est.get("monthly_payment") else None,
        "validUntil": str(est["valid_until"]) if est.get("valid_until") else None,
        "notes": est.get("notes"),
        "createdAt": str(est["created_at"]),
        "viewedAt": str(est["viewed_at"]) if est.get("viewed_at") else None,
        "acceptedAt": str(est["accepted_at"]) if est.get("accepted_at") else None,
        "signatureName": est.get("signature_name"),
    }

    return {"proposal": public_proposal}

@router.post("/api/proposal/{identifier}")
async def sign_public_proposal(
    identifier: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    if re.match(r"^\d+$", identifier):
        raise HTTPException(status_code=404, detail="Proposal not found")

    body = await request.json()
    signature_name = (body.get("signatureName") or "").strip()
    if not signature_name:
        raise HTTPException(status_code=400, detail="Full legal signature name is required")

    sql = text("""
        SELECT * FROM estimates
        WHERE estimate_number = :id OR access_token = :id
        LIMIT 1
    """)
    est_row = (await db.execute(sql, {"id": identifier})).mappings().first()
    if not est_row:
        raise HTTPException(status_code=404, detail="Proposal not found")

    est = dict(est_row)

    if est.get("status") == "accepted":
        return {"ok": True, "message": "Proposal was already accepted previously"}

    # Resolve or link Client
    client_id = est.get("client_id")
    if not client_id and est.get("lead_id"):
        lead_c = (await db.execute(text("SELECT client_id FROM leads WHERE id = :lid"), {"lid": est["lead_id"]})).scalar_one_or_none()
        if lead_c:
            client_id = lead_c

    if not client_id:
        client_id = await find_or_create_client(db, {
            "fullName": est["customer_name"],
            "phone": est.get("customer_phone"),
            "email": est.get("customer_email"),
            "address": est.get("customer_address"),
            "city": est.get("customer_city"),
            "zip": est.get("customer_zip"),
            "serviceType": est["service_type"],
            "leadSource": "proposal_portal",
        })

    # Update estimate to accepted
    await db.execute(text("""
        UPDATE estimates
        SET status = 'accepted',
            accepted_at = NOW(),
            signature_name = :sig,
            client_id = COALESCE(client_id, :cid),
            updated_at = NOW()
        WHERE id = :id
    """), {"sig": signature_name, "cid": client_id, "id": est["id"]})

    # Generate sequential Job Number JOB-YYYY-XXXX
    current_year = datetime.now().year
    job_count = (await db.execute(text("SELECT COUNT(*) FROM jobs"))).scalar_one() or 0
    job_number = f"JOB-{current_year}-{str(job_count + 1).zfill(4)}"

    # Create Job in 'permit_pending'
    insert_job_sql = text("""
        INSERT INTO jobs (
            lead_id, client_id, estimate_id, job_number, status, customer_name,
            customer_phone, customer_email, address, city, zip, service_type,
            contract_value, notes, created_at, updated_at
        ) VALUES (
            :lead_id, :client_id, :estimate_id, :job_number, 'permit_pending', :name,
            :phone, :email, :address, :city, :zip, :service_type,
            :contract_val, :notes, NOW(), NOW()
        ) RETURNING id
    """)
    job_id = (await db.execute(insert_job_sql, {
        "lead_id": est.get("lead_id"),
        "client_id": client_id,
        "estimate_id": est["id"],
        "job_number": job_number,
        "name": est["customer_name"],
        "phone": est.get("customer_phone"),
        "email": est.get("customer_email"),
        "address": est.get("customer_address"),
        "city": est.get("customer_city"),
        "zip": est.get("customer_zip"),
        "service_type": est["service_type"],
        "contract_val": float(est["total"]),
        "notes": f"Digitally signed online by {signature_name}",
    })).scalar_one()

    # Advance linked lead to Stage 5 and mark Won
    if est.get("lead_id"):
        await db.execute(text("""
            UPDATE leads
            SET status = 'won',
                pipeline_stage = 'stage_5_completion_followup',
                stage_entered_at = NOW(),
                contract_signed_at = NOW(),
                estimated_value = GREATEST(COALESCE(estimated_value, 0), :val),
                client_id = COALESCE(client_id, :cid),
                updated_at = NOW()
            WHERE id = :lid
        """), {"val": float(est["total"]), "cid": client_id, "lid": est["lead_id"]})

        await db.execute(text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
            VALUES ('lead', :lid, :cid, 'status_change', 'Contract Signed Online!', :desc, 'Customer', NOW())
        """), {
            "lid": est["lead_id"],
            "cid": client_id,
            "desc": f"Homeowner {signature_name} signed estimate {est['estimate_number']} (${float(est['total']):,.2f}). Project {job_number} created and dispatched!",
        })

    # Record security audit log
    await record_audit_log(
        db=db,
        action="proposal.signed",
        resource_type="estimate",
        resource_id=est["id"],
        changes={"signature": signature_name, "jobNumber": job_number, "total": float(est["total"])},
        request=request
    )

    if client_id:
        await recalculate_client_stats(db, client_id)

    return {
        "ok": True,
        "message": "Proposal accepted successfully! Rise Up Roofing dispatch notified.",
        "jobNumber": job_number,
        "jobId": job_id,
    }
