from app.core.logger import get_logger
import json
import re
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from app.core.database import get_db
from pydantic import BaseModel, Field

class CompleteJobPayload(BaseModel):
    notes: Optional[str] = ""
    authorName: Optional[str] = None
    authorRole: Optional[str] = None

class CreateJobActivityPayload(BaseModel):
    note: str = Field(..., min_length=1)
    authorName: Optional[str] = None
    authorRole: Optional[str] = None
from app.core.permissions import require_permission, require_any_permission, build_scope_filter
from app.services.sync import find_or_create_client, recalculate_client_stats
from app.schemas.jobs import JobCreate, JobUpdate, JobResponse

logger = get_logger(__name__)

router = APIRouter()

def _parse_job_record(job: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to ensure milestones and numeric fields are properly formatted."""
    res = dict(job)
    
    # Parse milestones JSONB
    ms = res.get("milestones")
    if ms is None:
        res["milestones"] = []
    elif isinstance(ms, str):
        try:
            res["milestones"] = json.loads(ms)
        except Exception:
            res["milestones"] = []
    elif isinstance(ms, list):
        res["milestones"] = ms
    else:
        res["milestones"] = []

    # Calculate milestone completion progress
    total_ms = len(res["milestones"])
    completed_ms = sum(1 for m in res["milestones"] if m.get("status") == "completed")
    res["milestone_progress"] = round((completed_ms / total_ms) * 100) if total_ms > 0 else 0
    res["milestones_completed_count"] = completed_ms
    res["milestones_total_count"] = total_ms

    if res.get("contract_value") is not None:
        res["contract_value"] = float(res["contract_value"])

    return res

@router.get("/jobs")
async def get_jobs(
    request: Request,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_permission("jobs:view")),
    db: AsyncSession = Depends(get_db)
):
    conditions: List[str] = []
    params: Dict[str, Any] = {}

    scope = build_scope_filter(
        user=user,
        action="jobs.view",
        creator_col="COALESCE(jobs.created_by, (SELECT created_by_user_id FROM leads WHERE leads.id = jobs.lead_id))",
        assigned_col="(SELECT assigned_to_user_id FROM leads WHERE leads.id = jobs.lead_id)",
        param_prefix="scope_"
    )

    if not scope["allowed"]:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions to view jobs")

    if scope["clause"] != "1=1":
        conditions.append(scope["clause"])
        params.update(scope["params"])

    if status and status != "all":
        if status == "active":
            conditions.append("status != 'complete' AND status != 'cancelled'")
        elif status == "completed" or status == "complete":
            conditions.append("status = 'complete'")
        else:
            params["status"] = status
            conditions.append("status = :status")

    if search and search.strip():
        s = search.strip().lower()
        params["search"] = f"%{s}%"
        conditions.append("""(
            LOWER(customer_name) LIKE :search OR
            LOWER(job_number) LIKE :search OR
            LOWER(COALESCE(address, '')) LIKE :search OR
            LOWER(COALESCE(city, '')) LIKE :search OR
            LOWER(COALESCE(service_type, '')) LIKE :search OR
            LOWER(COALESCE(crew_lead, '')) LIKE :search
        )""")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    jobs_query = text(f"SELECT * FROM jobs {where_clause} ORDER BY created_at DESC")
    stats_query = text(f"""
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN status != 'complete' AND status != 'cancelled' THEN 1 END) as active_count,
            COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed_count,
            COALESCE(SUM(contract_value), 0) as total_value,
            COALESCE(SUM(CASE WHEN status != 'complete' AND status != 'cancelled' THEN contract_value ELSE 0 END), 0) as active_value
        FROM jobs
        {where_clause}
    """)

    res = await db.execute(jobs_query, params)
    raw_jobs = [dict(r._mapping) for r in res.fetchall()]
    parsed_jobs = [_parse_job_record(j) for j in raw_jobs]

    stats_res = await db.execute(stats_query, params)
    s_row = stats_res.first()

    # Calculate overall milestone progress across active jobs
    active_jobs = [j for j in parsed_jobs if j.get("status") != "complete" and j.get("status") != "cancelled"]
    total_active_ms = sum(j["milestones_total_count"] for j in active_jobs)
    completed_active_ms = sum(j["milestones_completed_count"] for j in active_jobs)
    milestone_velocity = round((completed_active_ms / total_active_ms) * 100) if total_active_ms > 0 else 0

    # Count distinct active crew leads
    active_crews = len(set(j["crew_lead"] for j in active_jobs if j.get("crew_lead")))

    summary = {
        "totalCount": int(s_row.total_count or 0) if s_row else 0,
        "activeCount": int(s_row.active_count or 0) if s_row else 0,
        "completedCount": int(s_row.completed_count or 0) if s_row else 0,
        "totalValue": float(s_row.total_value or 0) if s_row else 0.0,
        "activeValue": float(s_row.active_value or 0) if s_row else 0.0,
        "milestoneVelocity": milestone_velocity,
        "activeCrews": active_crews,
    }

    return {
        "jobs": parsed_jobs,
        "summary": summary
    }

@router.post("/jobs")
async def create_job(
    payload: JobCreate,
    user: Dict[str, Any] = Depends(require_any_permission(["jobs:change_stage", "estimates:create"])),
    db: AsyncSession = Depends(get_db)
):
    lead_id = payload.lead_id
    client_id = payload.client_id
    customer_name = payload.customer_name
    customer_phone = payload.customer_phone
    customer_email = payload.customer_email
    address = payload.address
    city = payload.city
    zip_code = payload.zip
    service_type = payload.service_type or "Residential Roofing"
    contract_value = float(payload.contract_value or 0.0)
    scheduled_start = payload.scheduled_start
    estimated_days = int(payload.estimated_days or 3)
    crew_lead = payload.crew_lead
    crew_members = payload.crew_members or []
    notes = payload.notes
    status_val = payload.status or "scheduled"

    # Custom milestones start empty [] by default unless explicitly provided
    milestones_payload = payload.milestones or []
    if isinstance(milestones_payload, str):
        try:
            milestones_payload = json.loads(milestones_payload)
        except Exception:
            milestones_payload = []

    lead = None
    estimate_id = None
    if lead_id:
        parsed_lead_id = int(lead_id)
        l_res = await db.execute(text("SELECT * FROM leads WHERE id = :id"), {"id": parsed_lead_id})
        lead_row = l_res.first()
        if lead_row:
            lead = dict(lead_row._mapping)
            customer_name = customer_name or lead.get("full_name")
            customer_phone = customer_phone or lead.get("phone")
            customer_email = customer_email or lead.get("email")
            address = address or lead.get("address")
            city = city or lead.get("city")
            zip_code = zip_code or lead.get("zip")
            service_type = service_type or lead.get("service_type") or "Residential Roofing"
            if not contract_value and lead.get("estimated_value"):
                contract_value = float(lead.get("estimated_value") or 0)
            if not client_id and lead.get("client_id"):
                client_id = int(lead.get("client_id"))

            # Find estimate to link if exists
            est_res = await db.execute(
                text("SELECT id, total FROM estimates WHERE lead_id = :lid OR (client_id = :cid AND client_id IS NOT NULL) ORDER BY created_at DESC LIMIT 1"),
                {"lid": parsed_lead_id, "cid": client_id}
            )
            est_row = est_res.first()
            if est_row:
                estimate_id = int(est_row.id)
                if not contract_value and est_row.total:
                    contract_value = float(est_row.total)

    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer name is required to create a job")

    if not client_id:
        c = await find_or_create_client(
            db=db,
            full_name=customer_name,
            phone=customer_phone,
            email=customer_email,
            address=address,
            city=city,
            zip_code=zip_code,
            lead_source=lead.get("lead_source") if lead else "job_dispatch"
        )
        client_id = c.id
        if lead_id:
            await db.execute(text("UPDATE leads SET client_id = :cid WHERE id = :id"), {"cid": client_id, "id": int(lead_id)})

    job_created_by = (lead.get("created_by_user_id") or lead.get("created_by")) if lead else user.get("id")
    job_role_snapshot = (lead.get("created_by_role_snapshot")) if lead else (
        ", ".join([r["name"] for r in user.get("roles", [])]) if user.get("roles") else user.get("role", "Staff")
    )

    year = datetime.now(timezone.utc).year
    count_res = await db.execute(text("SELECT COUNT(*) FROM jobs"))
    seq = str(int(count_res.scalar() or 0) + 1).zfill(4)
    job_number = f"JOB-{year}-{seq}"

    insert_stmt = text("""
        INSERT INTO jobs (
            lead_id, client_id, estimate_id, job_number, status, customer_name, customer_phone, customer_email,
            address, city, zip, service_type, contract_value, scheduled_start,
            estimated_days, crew_lead, crew_members, notes, milestones,
            created_by, created_by_role_snapshot
        ) VALUES (
            :lead_id, :client_id, :est_id, :job_num, :status, :c_name, :c_phone, :c_email,
            :addr, :city, :zip, :svc_type, :c_val, :sched_start,
            :est_days, :crew_lead, :crew_members, :notes, CAST(:milestones AS jsonb),
            :creator, :role_snap
        ) RETURNING *
    """)

    res = await db.execute(insert_stmt, {
        "lead_id": int(lead_id) if lead_id else None,
        "client_id": client_id,
        "est_id": estimate_id,
        "job_num": job_number,
        "status": status_val,
        "c_name": customer_name,
        "c_phone": customer_phone,
        "c_email": customer_email,
        "addr": address,
        "city": city,
        "zip": zip_code,
        "svc_type": service_type,
        "c_val": contract_value,
        "sched_start": scheduled_start,
        "est_days": estimated_days,
        "crew_lead": crew_lead,
        "crew_members": crew_members,
        "notes": notes,
        "milestones": json.dumps(milestones_payload),
        "creator": job_created_by,
        "role_snap": job_role_snapshot,
    })
    new_job_row = dict(res.first()._mapping)
    new_job = _parse_job_record(new_job_row)

    if lead_id:
        await db.execute(
            text("""
                UPDATE leads 
                SET pipeline_stage = 'stage_5_completion_followup',
                    stage_entered_at = CASE WHEN pipeline_stage != 'stage_5_completion_followup' THEN NOW() ELSE stage_entered_at END,
                    status = 'won',
                    contract_signed_at = COALESCE(contract_signed_at, NOW()),
                    estimated_value = GREATEST(COALESCE(estimated_value, 0), :val),
                    updated_at = NOW()
                WHERE id = :id
            """),
            {"val": contract_value, "id": int(lead_id)}
        )

    if estimate_id:
        await db.execute(
            text("UPDATE estimates SET status = 'accepted', accepted_at = COALESCE(accepted_at, NOW()), client_id = COALESCE(client_id, :cid) WHERE id = :id"),
            {"cid": client_id, "id": estimate_id}
        )

    if client_id:
        await recalculate_client_stats(db, client_id)

    # Log initial dispatch activity
    author_name = user.get("name") or "Staff"
    await db.execute(
        text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
            VALUES ('job', :jid, :cid, 'status_change', :title, :desc, :pby)
        """),
        {
            "jid": new_job["id"],
            "cid": client_id,
            "title": f"Job Created: {job_number}",
            "desc": f"Work order created for {customer_name}. Scope: {service_type}. Value: ${contract_value:,.2f}",
            "pby": author_name
        }
    )

    await db.commit()
    return {"ok": True, "job": new_job}

@router.get("/jobs/{job_id}")
async def get_job(
    job_id: int,
    user: Dict[str, Any] = Depends(require_permission("jobs:view")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    job = _parse_job_record(dict(row._mapping))
    estimate = None
    if job.get("estimate_id"):
        est_res = await db.execute(text("SELECT * FROM estimates WHERE id = :id"), {"id": job["estimate_id"]})
        est_row = est_res.first()
        if est_row:
            estimate = dict(est_row._mapping)

    return {"job": job, "estimate": estimate}

@router.patch("/jobs/{job_id}")
async def update_job(
    job_id: int,
    payload: JobUpdate,
    user: Dict[str, Any] = Depends(require_any_permission(["jobs:change_stage", "jobs:manage_permits"])),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    allowed_fields = [
        "status", "customer_name", "customer_phone", "customer_email",
        "address", "city", "zip", "service_type", "contract_value",
        "crew_lead", "crew_members", "scheduled_start", "estimated_days",
        "actual_start", "actual_end", "weather_delays", "notes",
        "permit_status", "permit_number", "permit_filed_at", "permit_approved_at",
        "material_status", "material_ordered_at", "material_delivered_at"
    ]

    updates = []
    params: Dict[str, Any] = {"id": job_id}

    for f in allowed_fields:
        # Check snake_case and camelCase
        camel_f = re.sub(r'_([a-z])', lambda m: m.group(1).upper(), f)
        val = payload_dict.get(f) if f in payload_dict else payload_dict.get(camel_f)
        if val is not None or f in payload_dict or camel_f in payload_dict:
            params[f] = val
            updates.append(f"{f} = :{f}")

    if "milestones" in payload_dict:
        ms_val = payload_dict["milestones"]
        if isinstance(ms_val, (list, dict)):
            ms_json = json.dumps(ms_val)
        elif isinstance(ms_val, str):
            ms_json = ms_val
        else:
            ms_json = "[]"
        params["milestones"] = ms_json
        updates.append("milestones = CAST(:milestones AS jsonb)")

    if not updates:
        return {"ok": True}

    updates.append("updated_at = NOW()")

    stmt = text(f"UPDATE jobs SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    updated_job = _parse_job_record(dict(row._mapping))

    # If status transitioned to complete
    if payload_dict.get("status") == "complete":
        if updated_job.get("lead_id"):
            await db.execute(
                text("UPDATE leads SET job_completed_at = COALESCE(job_completed_at, NOW()), status = 'completed', updated_at = NOW() WHERE id = :id"),
                {"id": updated_job["lead_id"]}
            )
        try:
            author_name = user.get("name") if isinstance(user, dict) else (getattr(user, "name", None) or "Staff")
            author_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
            contract_val = float(updated_job.get("contract_value") or 0)
            meta_dict = {
                "job_title": f"Job #{updated_job.get('job_number') or job_id}",
                "contract_value": contract_val,
                "customer_name": updated_job.get("customer_name")
            }
            await db.execute(
                text("""
                    INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, metadata, created_at)
                    VALUES ('job', :jid, :cid, 'job_completed', 'Job Completed', :desc, :pby, :uid, :uname, CAST(:meta AS jsonb), NOW())
                """),
                {
                    "jid": int(job_id),
                    "cid": int(updated_job["client_id"]) if updated_job.get("client_id") else None,
                    "desc": f"Job {updated_job.get('job_number') or job_id} marked complete. Contract value: ${contract_val:,.2f}",
                    "pby": author_name,
                    "uid": author_id,
                    "uname": author_name,
                    "meta": json.dumps(meta_dict)
                }
            )
        except Exception as e:
            logger.error(f"Failed to record job_completed activity: {e}")

        try:
            from app.core.redis import cache_delete
            await cache_delete("crm:dashboard:stats")
        except Exception:
            pass

    if updated_job.get("client_id"):
        await recalculate_client_stats(db, int(updated_job["client_id"]))

    await db.commit()
    return {"ok": True, "job": updated_job}

@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: int,
    payload: CompleteJobPayload,
    user: Dict[str, Any] = Depends(require_any_permission(["jobs:change_stage", "jobs:manage_permits"])),
    db: AsyncSession = Depends(get_db)
):
    """Explicit endpoint to mark a job completed, log notes, and update client & lead stats."""
    payload_dict = payload.model_dump(exclude_unset=True)
    res = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    job = dict(row._mapping)
    notes = payload_dict.get("notes", "").strip()
    author_name = payload_dict.get("authorName") or user.get("name") or "Staff"
    author_role = payload_dict.get("authorRole") or user.get("role") or "Field Manager"

    # Append completion note to job notes if provided
    updated_notes = job.get("notes") or ""
    if notes:
        now_str = datetime.now().strftime("%b %d, %Y • %I:%M %p")
        note_entry = f"[{now_str} — {author_name} ({author_role})]\n➔ Job Completed: {notes}"
        updated_notes = f"{updated_notes}\n\n{note_entry}".strip() if updated_notes else note_entry

    stmt = text("""
        UPDATE jobs
        SET status = 'complete',
            actual_end = COALESCE(actual_end, CURRENT_DATE),
            notes = :notes,
            updated_at = NOW()
        WHERE id = :id
        RETURNING *
    """)
    up_res = await db.execute(stmt, {"notes": updated_notes, "id": job_id})
    completed_job = _parse_job_record(dict(up_res.first()._mapping))

    # Sync lead
    if completed_job.get("lead_id"):
        await db.execute(
            text("UPDATE leads SET job_completed_at = COALESCE(job_completed_at, NOW()), status = 'completed', updated_at = NOW() WHERE id = :id"),
            {"id": completed_job["lead_id"]}
        )

    # Sync client stats
    if completed_job.get("client_id"):
        await recalculate_client_stats(db, int(completed_job["client_id"]))

    # Insert activity log
    contract_val = float(completed_job.get("contract_value") or 0)
    meta_dict = {
        "job_title": f"Job #{completed_job.get('job_number') or job_id}",
        "contract_value": contract_val,
        "customer_name": completed_job.get("customer_name")
    }
    await db.execute(
        text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, metadata, created_at)
            VALUES ('job', :jid, :cid, 'job_completed', 'Job Completed & Warrantied', :desc, :pby, :uid, :uname, CAST(:meta AS jsonb), NOW())
        """),
        {
            "jid": int(job_id),
            "cid": int(completed_job["client_id"]) if completed_job.get("client_id") else None,
            "desc": f"Job {completed_job.get('job_number') or job_id} completed. Contract: ${contract_val:,.2f}. {notes}".strip(),
            "pby": author_name,
            "uid": user.get("id"),
            "uname": author_name,
            "meta": json.dumps(meta_dict)
        }
    )

    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass

    await db.commit()
    return {"ok": True, "job": completed_job}

@router.get("/jobs/{job_id}/activities")
async def get_job_activities(
    job_id: int,
    user: Dict[str, Any] = Depends(require_permission("jobs:view")),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve activity logs and notes for a specific job."""
    res = await db.execute(
        text("""
            SELECT id, entity_type, entity_id, client_id, activity_type, title, description,
                   performed_by, user_id, user_name, metadata, created_at
            FROM activities
            WHERE (entity_type = 'job' AND entity_id = :id)
               OR (entity_type = 'lead' AND entity_id = (SELECT lead_id FROM jobs WHERE id = :id AND lead_id IS NOT NULL))
            ORDER BY created_at DESC
        """),
        {"id": job_id}
    )
    activities = [dict(r._mapping) for r in res.fetchall()]
    return {"activities": activities}

@router.post("/jobs/{job_id}/activities")
async def create_job_activity(
    job_id: int,
    payload: CreateJobActivityPayload,
    user: Dict[str, Any] = Depends(require_any_permission(["jobs:change_stage", "jobs:manage_permits"])),
    db: AsyncSession = Depends(get_db)
):
    """Log a field note or progress update to the job activity timeline."""
    payload_dict = payload.model_dump(exclude_unset=True)
    note = payload_dict.get("note", "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="Activity note is required")

    job_res = await db.execute(text("SELECT client_id, notes FROM jobs WHERE id = :id"), {"id": job_id})
    job_row = job_res.first()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")

    client_id = job_row.client_id
    author_name = payload_dict.get("authorName") or user.get("name") or "Staff"
    author_role = payload_dict.get("authorRole") or user.get("role") or "Field Manager"

    now_str = datetime.now().strftime("%b %d, %Y • %I:%M %p")
    note_entry = f"[{now_str} — {author_name} ({author_role})]\n{note}"

    # Insert into activities table
    await db.execute(
        text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, created_at)
            VALUES ('job', :jid, :cid, 'note', 'Field Note Added', :desc, :pby, :uid, :uname, NOW())
        """),
        {
            "jid": job_id,
            "cid": client_id,
            "desc": note_entry,
            "pby": author_name,
            "uid": user.get("id"),
            "uname": author_name,
        }
    )

    # Append to job notes column
    existing_notes = job_row.notes or ""
    updated_notes = f"{existing_notes}\n\n{note_entry}".strip() if existing_notes else note_entry
    await db.execute(
        text("UPDATE jobs SET notes = :notes, updated_at = NOW() WHERE id = :id"),
        {"notes": updated_notes, "id": job_id}
    )

    await db.commit()
    return {"ok": True, "note": note_entry}

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: int,
    user: Dict[str, Any] = Depends(require_permission("jobs:delete")),
    db: AsyncSession = Depends(get_db)
):
    ex = await db.execute(text("SELECT client_id FROM jobs WHERE id = :id"), {"id": job_id})
    ex_row = ex.first()
    client_id = int(ex_row.client_id) if ex_row and ex_row.client_id else None

    await db.execute(text("DELETE FROM jobs WHERE id = :id"), {"id": job_id})
    if client_id:
        await recalculate_client_stats(db, client_id)

    await db.commit()
    return {"ok": True}
