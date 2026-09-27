from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.permissions import require_permission, require_any_permission
from app.core.storage import storage_service
from app.core.config import settings
import orjson

class CreateCrewPayload(BaseModel):
    name: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    phone: Optional[str] = None
    active: bool = True
    currentJobId: Optional[int] = None
    skills: List[str] = []
    notes: Optional[str] = None

class UpdateCrewPayload(BaseModel):
    id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    currentJobId: Optional[int] = None
    skills: Optional[List[str]] = None
    notes: Optional[str] = None

class SavePhotoPayload(BaseModel):
    jobId: int
    url: str = Field(..., min_length=1)
    phase: str = "before"
    caption: Optional[str] = None
    uploadedBy: Optional[str] = None

class CreateInspectionPayload(BaseModel):
    leadId: Optional[int] = None
    jobId: Optional[int] = None
    inspectorName: str = "Michael (Rise Up Lead Inspector)"
    findings: Optional[List[Any]] = []
    estimatedRemainingYears: Optional[int] = None
    notes: Optional[str] = None
    inspectionDate: Optional[str] = None

class CreateWarrantyPayload(BaseModel):
    jobId: int
    startDate: Optional[str] = None
    yearsDuration: int = 50
    coverageDetails: Optional[str] = None
    warrantyType: str = "Owens Corning Preferred Protection (50-Yr System)"

class UpdateWarrantyPayload(BaseModel):
    id: int
    checkin6moCompleted: Optional[bool] = None
    checkin1yrCompleted: Optional[bool] = None
    status: Optional[str] = None

router = APIRouter()

# ── CREW DISPATCH ────────────────────────────────────────────────────────────

@router.get("/crew")
async def get_crew(
    role: Optional[str] = None,
    active: Optional[bool] = None,
    user: Dict[str, Any] = Depends(require_any_permission(["field:manage_crew", "field:view_calendar"])),
    db: AsyncSession = Depends(get_db)
):
    conditions = []
    params: Dict[str, Any] = {}

    if role and role != "all":
        params["role"] = role
        conditions.append("c.role = :role")

    if active is not None:
        params["active"] = active
        conditions.append("c.active = :active")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    stmt = text(f"""
        SELECT c.*, 
               j.job_number, j.customer_name as current_job_customer, j.address as current_job_address, j.city as current_job_city, j.status as current_job_status
        FROM crew_members c
        LEFT JOIN jobs j ON c.current_job_id = j.id
        {where_clause}
        ORDER BY c.active DESC, c.role ASC, c.name ASC
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    counts_res = await db.execute(text("""
        SELECT 
            COUNT(*) as total_crew,
            COUNT(CASE WHEN active = true THEN 1 END) as active_count,
            COUNT(CASE WHEN role = 'foreman' AND active = true THEN 1 END) as foremen_count,
            COUNT(CASE WHEN role IN ('lead_installer', 'laborer') AND active = true THEN 1 END) as installer_count,
            COUNT(CASE WHEN current_job_id IS NOT NULL AND active = true THEN 1 END) as on_job_count
        FROM crew_members
    """))
    counts = counts_res.first()

    summary = {
        "totalCrew": int(counts.total_crew or 0) if counts else 0,
        "activeCount": int(counts.active_count or 0) if counts else 0,
        "foremenCount": int(counts.foremen_count or 0) if counts else 0,
        "installerCount": int(counts.installer_count or 0) if counts else 0,
        "onJobCount": int(counts.on_job_count or 0) if counts else 0,
    }

    return {"crew": rows, "summary": summary}

@router.post("/crew")
async def create_crew(
    payload: CreateCrewPayload,
    user: Dict[str, Any] = Depends(require_permission("field:manage_crew")),
    db: AsyncSession = Depends(get_db)
):
    name = payload.name
    role = payload.role

    stmt = text("""
        INSERT INTO crew_members (name, phone, role, active, current_job_id, skills, notes)
        VALUES (:name, :phone, :role, :active, :job_id, :skills, :notes)
        RETURNING *
    """)
    res = await db.execute(stmt, {
        "name": name,
        "phone": payload.phone,
        "role": role,
        "active": payload.active,
        "job_id": payload.currentJobId,
        "skills": payload.skills,
        "notes": payload.notes,
    })
    await db.commit()
    return {"ok": True, "crewMember": dict(res.first()._mapping)}

@router.patch("/crew")
async def update_crew(
    payload: UpdateCrewPayload,
    user: Dict[str, Any] = Depends(require_permission("field:manage_crew")),
    db: AsyncSession = Depends(get_db)
):
    cid = payload.id

    updates = []
    params: Dict[str, Any] = {"id": cid}

    if payload.name is not None:
        params["name"] = payload.name
        updates.append("name = :name")
    if payload.phone is not None:
        params["phone"] = payload.phone
        updates.append("phone = :phone")
    if payload.role is not None:
        params["role"] = payload.role
        updates.append("role = :role")
    if payload.active is not None:
        params["active"] = payload.active
        updates.append("active = :active")
    if payload.notes is not None:
        params["notes"] = payload.notes
        updates.append("notes = :notes")

    if payload.currentJobId is not None:
        params["job_id"] = payload.currentJobId
        updates.append("current_job_id = :job_id")

    if payload.skills is not None:
        params["skills"] = payload.skills
        updates.append("skills = :skills")

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    stmt = text(f"UPDATE crew_members SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    await db.commit()
    row = res.first()
    return {"ok": True, "crewMember": dict(row._mapping) if row else None}

@router.delete("/crew")
async def delete_crew(
    id: int = Query(...),
    user: Dict[str, Any] = Depends(require_permission("field:manage_crew")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM crew_members WHERE id = :id"), {"id": id})
    await db.commit()
    return {"ok": True}

# ── JOB PHOTOS & S3 PRESIGNED UPLOADS ────────────────────────────────────────

@router.get("/photos")
async def get_photos(
    job_id: int = Query(...),
    phase: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_permission("jobs:view")),
    db: AsyncSession = Depends(get_db)
):
    conditions = ["job_id = :job_id"]
    params: Dict[str, Any] = {"job_id": job_id}

    if phase and phase != "all":
        params["phase"] = phase
        conditions.append("phase = :phase")

    stmt = text(f"SELECT * FROM job_photos WHERE {' AND '.join(conditions)} ORDER BY created_at DESC")
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]
    return {"photos": rows}

@router.get("/photos/presign")
async def presign_photo_upload(
    job_id: int = Query(...),
    phase: str = Query("before"),
    filename: str = Query("photo.jpg"),
    content_type: str = Query("image/jpeg"),
    user: Dict[str, Any] = Depends(require_permission("photos:upload"))
):
    ext = filename.split(".")[-1] if "." in filename else "jpg"
    unique_key = f"jobs/{job_id}/{phase}_{secrets.token_hex(8)}.{ext}"
    presigned = await storage_service.generate_presigned_upload_url(
        bucket=settings.S3_MEDIA_BUCKET,
        key=unique_key,
        content_type=content_type,
        expires_in=900
    )
    return {
        "ok": True,
        "uploadUrl": presigned["url"],
        "key": unique_key,
        "publicUrl": presigned["public_url"],
    }

@router.post("/photos")
async def save_photo(
    payload: SavePhotoPayload,
    user: Dict[str, Any] = Depends(require_permission("photos:upload")),
    db: AsyncSession = Depends(get_db)
):
    job_id = payload.jobId
    url = payload.url

    phase = payload.phase
    caption = payload.caption
    uploaded_by = payload.uploadedBy or user.get("name") or "Field Crew"

    stmt = text("""
        INSERT INTO job_photos (job_id, phase, url, caption, uploaded_by)
        VALUES (:jid, :phase, :url, :caption, :up_by)
        RETURNING *
    """)
    res = await db.execute(stmt, {
        "jid": job_id,
        "phase": phase,
        "url": url,
        "caption": caption,
        "up_by": uploaded_by,
    })
    photo = dict(res.first()._mapping)

    j_res = await db.execute(text("SELECT lead_id, job_number FROM jobs WHERE id = :id"), {"id": job_id})
    j_row = j_res.first()
    if j_row and j_row.lead_id:
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, activity_type, title, description, performed_by)
                VALUES ('lead', :lid, 'note', :title, :desc, :pby)
            """),
            {
                "lid": j_row.lead_id,
                "title": f"Photo Uploaded: {phase.upper()} Phase",
                "desc": caption or f"Photo added to project documentation for {j_row.job_number}",
                "pby": uploaded_by,
            }
        )

    await db.commit()
    return {"ok": True, "photo": photo}

@router.delete("/photos")
async def delete_photo(
    id: int = Query(...),
    user: Dict[str, Any] = Depends(require_permission("photos:delete")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM job_photos WHERE id = :id"), {"id": id})
    await db.commit()
    return {"ok": True}

# ── INSPECTIONS ──────────────────────────────────────────────────────────────

@router.get("/inspections")
async def get_inspections(
    lead_id: Optional[int] = None,
    urgent: Optional[bool] = None,
    user: Dict[str, Any] = Depends(require_any_permission(["inspections:conduct", "jobs:view", "leads:view"])),
    db: AsyncSession = Depends(get_db)
):
    conditions = []
    params: Dict[str, Any] = {}

    if lead_id:
        params["lead_id"] = lead_id
        conditions.append("i.lead_id = :lead_id")

    if urgent:
        conditions.append("i.urgent_action_required = true")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    stmt = text(f"""
        SELECT i.*, 
               l.full_name as customer_name, l.phone as customer_phone, l.email as customer_email,
               l.address, l.zip, l.service_type,
               j.job_number,
               COALESCE(i.client_id, l.client_id, j.client_id) as client_id
        FROM inspections i
        LEFT JOIN leads l ON i.lead_id = l.id
        LEFT JOIN jobs j ON i.job_id = j.id
        {where_clause}
        ORDER BY i.inspection_date DESC, i.created_at DESC
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    stats_res = await db.execute(text("""
        SELECT 
            COUNT(*) as total_count,
            ROUND(COALESCE(AVG(roof_health_score), 85)) as avg_score,
            COUNT(CASE WHEN urgent_action_required = true THEN 1 END) as urgent_count
        FROM inspections
    """))
    stats = stats_res.first()

    summary = {
        "totalCount": int(stats.total_count or 0) if stats else 0,
        "avgHealthScore": int(stats.avg_score or 85) if stats else 85,
        "urgentCount": int(stats.urgent_count or 0) if stats else 0,
    }

    return {"inspections": rows, "summary": summary}

@router.post("/inspections")
async def create_inspection(
    payload: CreateInspectionPayload,
    user: Dict[str, Any] = Depends(require_permission("inspections:conduct")),
    db: AsyncSession = Depends(get_db)
):
    lead_id = payload.leadId
    job_id = payload.jobId

    if not lead_id and not job_id:
        raise HTTPException(status_code=400, detail="Lead ID or Job ID is required")

    inspector_name = payload.inspectorName
    findings = payload.findings or []

    score = 100
    has_urgent = False
    for item in findings:
        status_val = item.get("status") if isinstance(item, dict) else None
        if status_val == "critical":
            score -= 18
            has_urgent = True
        elif status_val == "fair":
            score -= 6
    final_score = max(15, min(100, score))

    year = datetime.now(timezone.utc).year
    count_res = await db.execute(text("SELECT COUNT(*) FROM inspections"))
    seq = str(int(count_res.scalar() or 0) + 1).zfill(4)
    inspection_number = f"INSP-{year}-{seq}"
    access_token = secrets.token_hex(16)

    resolved_client_id = None
    if lead_id:
        l = await db.execute(text("SELECT client_id FROM leads WHERE id = :id"), {"id": lead_id})
        r = l.first()
        if r and r.client_id: resolved_client_id = int(r.client_id)
    if not resolved_client_id and job_id:
        j = await db.execute(text("SELECT client_id FROM jobs WHERE id = :id"), {"id": job_id})
        r = j.first()
        if r and r.client_id: resolved_client_id = int(r.client_id)

    findings_json = orjson.dumps(findings).decode("utf-8")
    ins_date = payload.inspectionDate or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    stmt = text("""
        INSERT INTO inspections (
            lead_id, job_id, client_id, inspection_number, inspector_name, inspection_date,
            roof_health_score, findings, urgent_action_required, estimated_remaining_years, notes, access_token
        ) VALUES (
            :lid, :jid, :cid, :inum, :iname, :idate,
            :score, :findings, :urgent, :years, :notes, :token
        ) RETURNING *
    """)
    res = await db.execute(stmt, {
        "lid": lead_id,
        "jid": job_id,
        "cid": resolved_client_id,
        "inum": inspection_number,
        "iname": inspector_name,
        "idate": ins_date,
        "score": final_score,
        "findings": findings_json,
        "urgent": has_urgent,
        "years": payload.estimatedRemainingYears or 3,
        "notes": payload.notes,
        "token": access_token,
    })
    insp = dict(res.first()._mapping)

    if lead_id:
        await db.execute(
            text("""
                UPDATE leads 
                SET status = CASE WHEN status IN ('new', 'contacted') THEN 'inspected' ELSE status END,
                pipeline_stage = CASE WHEN pipeline_stage IN ('stage_1_lead_gen', 'stage_2_initial_contact') THEN 'stage_3_site_visit_estimate' ELSE pipeline_stage END,
                site_visit_completed_at = COALESCE(site_visit_completed_at, NOW()),
                last_contact_at = NOW(),
                updated_at = NOW()
                WHERE id = :id
            """),
            {"id": lead_id}
        )
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                VALUES ('lead', :lid, :cid, 'visit', :title, :desc, :pby)
            """),
            {
                "lid": lead_id,
                "cid": resolved_client_id,
                "title": f"Roof Inspection Completed: Score {final_score}/100",
                "desc": f"Inspection {inspection_number} performed by {inspector_name}.{' ⚠️ Critical roof damage identified!' if has_urgent else ''}",
                "pby": inspector_name,
            }
        )

    await db.commit()
    return {"ok": True, "inspection": insp}

@router.delete("/inspections")
async def delete_inspection(
    id: int = Query(...),
    user: Dict[str, Any] = Depends(require_permission("inspections:conduct")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM inspections WHERE id = :id"), {"id": id})
    await db.commit()
    return {"ok": True}

# ── WARRANTIES ───────────────────────────────────────────────────────────────

@router.get("/warranties")
async def get_warranties(
    status: Optional[str] = None,
    job_id: Optional[int] = None,
    user: Dict[str, Any] = Depends(require_any_permission(["warranties:issue", "jobs:view"])),
    db: AsyncSession = Depends(get_db)
):
    conditions = []
    params: Dict[str, Any] = {}

    if job_id:
        params["job_id"] = job_id
        conditions.append("w.job_id = :job_id")

    if status and status != "all":
        if status == "checkin_due":
            conditions.append("""(
                (w.checkin_6mo_completed = false AND w.checkin_6mo_due <= CURRENT_DATE + INTERVAL '14 days') OR 
                (w.checkin_1yr_completed = false AND w.checkin_1yr_due <= CURRENT_DATE + INTERVAL '14 days')
            )""")
        else:
            params["status"] = status
            conditions.append("w.status = :status")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    stmt = text(f"""
        SELECT w.*, 
               j.job_number, j.customer_name, j.customer_phone, j.customer_email, 
               j.address, j.city, j.service_type, j.contract_value,
               e.material_type, e.roof_squares,
               COALESCE(w.client_id, j.client_id) as client_id
        FROM warranties w
        LEFT JOIN jobs j ON w.job_id = j.id
        LEFT JOIN estimates e ON j.estimate_id = e.id
        {where_clause}
        ORDER BY w.created_at DESC
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    stats_res = await db.execute(text("""
        SELECT 
            COUNT(*) as total_warranties,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
            COUNT(CASE WHEN checkin_6mo_completed = false AND checkin_6mo_due <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as checkin_6mo_due,
            COUNT(CASE WHEN checkin_1yr_completed = false AND checkin_1yr_due <= CURRENT_DATE + INTERVAL '14 days' THEN 1 END) as checkin_1yr_due
        FROM warranties
    """))
    stats = stats_res.first()

    summary = {
        "totalWarranties": int(stats.total_warranties or 0) if stats else 0,
        "activeCount": int(stats.active_count or 0) if stats else 0,
        "checkin6moDue": int(stats.checkin_6mo_due or 0) if stats else 0,
        "checkin1yrDue": int(stats.checkin_1yr_due or 0) if stats else 0,
    }

    return {"warranties": rows, "summary": summary}

@router.post("/warranties")
async def create_warranty(
    payload: CreateWarrantyPayload,
    user: Dict[str, Any] = Depends(require_permission("warranties:issue")),
    db: AsyncSession = Depends(get_db)
):
    job_id = payload.jobId

    j_res = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id})
    job_row = j_res.first()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")
    job = dict(job_row._mapping)

    year = datetime.now(timezone.utc).year
    count_res = await db.execute(text("SELECT COUNT(*) FROM warranties"))
    seq = str(int(count_res.scalar() or 0) + 1).zfill(4)
    warranty_number = f"WAR-{year}-{seq}"
    access_token = secrets.token_hex(16)

    start_date = payload.startDate
    start = datetime.fromisoformat(start_date) if start_date else datetime.now(timezone.utc)
    years = payload.yearsDuration

    exp_date = (start + timedelta(days=years*365)).strftime("%Y-%m-%d")
    checkin_6mo = (start + timedelta(days=182)).strftime("%Y-%m-%d")
    checkin_1yr = (start + timedelta(days=365)).strftime("%Y-%m-%d")
    start_date_str = start.strftime("%Y-%m-%d")

    coverage = payload.coverageDetails or "Owens Corning Preferred Protection System Warranty (50-Year Non-Prorated TruDefinition Duration Shingles) with Rise Up Roofing 10-Year Workmanship Guarantee. CSLB #1096492."

    client_id = job.get("client_id")
    if not client_id and job.get("lead_id"):
        l = await db.execute(text("SELECT client_id FROM leads WHERE id = :id"), {"id": job["lead_id"]})
        r = l.first()
        if r and r.client_id: client_id = int(r.client_id)

    stmt = text("""
        INSERT INTO warranties (
            job_id, lead_id, client_id, warranty_number, warranty_type, start_date, expiration_date,
            coverage_details, status, checkin_6mo_due, checkin_1yr_due, access_token
        ) VALUES (
            :jid, :lid, :cid, :wnum, :wtype, :sdate, :edate,
            :cov, 'active', :c6, :c1, :token
        ) RETURNING *
    """)
    res = await db.execute(stmt, {
        "jid": job["id"],
        "lid": job.get("lead_id"),
        "cid": client_id,
        "wnum": warranty_number,
        "wtype": payload.warrantyType,
        "sdate": start_date_str,
        "edate": exp_date,
        "cov": coverage,
        "c6": checkin_6mo,
        "c1": checkin_1yr,
        "token": access_token,
    })
    war = dict(res.first()._mapping)

    if job.get("lead_id"):
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                VALUES ('lead', :lid, :cid, 'status_change', :title, :desc, 'Warranty Dept')
            """),
            {
                "lid": job["lead_id"],
                "cid": client_id,
                "title": f"Warranty Certificate Issued: {warranty_number}",
                "desc": f"{war.get('warranty_type')} issued. Valid through {exp_date}. 6-month inspection scheduled for {checkin_6mo}.",
            }
        )

    await db.commit()
    return {"ok": True, "warranty": war}

@router.patch("/warranties")
async def update_warranty(
    payload: UpdateWarrantyPayload,
    user: Dict[str, Any] = Depends(require_permission("warranties:issue")),
    db: AsyncSession = Depends(get_db)
):
    wid = payload.id

    updates = []
    params: Dict[str, Any] = {"id": wid}

    if payload.checkin6moCompleted is not None:
        params["c6"] = payload.checkin6moCompleted
        updates.append("checkin_6mo_completed = :c6")

    if payload.checkin1yrCompleted is not None:
        params["c1"] = payload.checkin1yrCompleted
        updates.append("checkin_1yr_completed = :c1")

    if payload.status is not None:
        params["status"] = payload.status
        updates.append("status = :status")

    updates.append("updated_at = NOW()")

    stmt = text(f"UPDATE warranties SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Warranty not found")
    war = dict(row._mapping)

    if payload.checkin6moCompleted or payload.checkin1yrCompleted:
        j_res = await db.execute(text("SELECT lead_id FROM jobs WHERE id = :id"), {"id": war["job_id"]})
        j = j_res.first()
        if j and j.lead_id:
            ms = "6-Month Post-Job Check-In" if payload.checkin6moCompleted else "1-Year Post-Job Check-In"
            await db.execute(
                text("""
                    INSERT INTO activities (entity_type, entity_id, activity_type, title, description, performed_by)
                    VALUES ('lead', :lid, 'visit', :title, :desc, 'Field Inspector')
                """),
                {
                    "lid": j.lead_id,
                    "title": f"Warranty Follow-up Completed: {ms}",
                    "desc": f"Verified roof flashing, valleys, and underlayment for {war.get('warranty_number')}. Homeowner in good standing.",
                }
            )

    await db.commit()
    return {"ok": True, "warranty": war}
