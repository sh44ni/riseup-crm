from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import math
import asyncio
import os
import uuid
import re
import json
from pydantic import BaseModel, Field

def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

def classify_media_type(filename: str, content_type: Optional[str]) -> str:
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    video_exts = {"mp4", "webm", "mov", "m4v", "ogg", "ogv", "mkv", "avi", "quicktime"}
    if (content_type and content_type.startswith("video/")) or ext in video_exts:
        return "video"
    return "photo"

from app.core.database import get_db
from app.middlewares.auth import get_current_user
from app.core.permissions import require_permission, build_scope_filter, check_resource_access, AuthUser
from app.services.sync import find_or_create_client, normalize_phone, recalculate_client_stats, auto_heal_dataflow_sync, parse_address_components
from app.utils.formatting import format_person_name
from app.schemas.clients import CreateClientRequest, CreateExistingClientRequest, ClientResponse

class CreateClientPayload(BaseModel):
    fullName: Optional[str] = None
    full_name: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    secondaryPhone: Optional[str] = None
    secondary_phone: Optional[str] = None
    sourceType: Optional[str] = None
    source_type: Optional[str] = None
    acquiredByUserId: Optional[int] = None
    acquired_by_user_id: Optional[int] = None
    leadSourceDetail: Optional[str] = None
    lead_source_detail: Optional[str] = None
    assignedToUserId: Optional[int] = None
    assigned_to_user_id: Optional[int] = None
    roofSqf: Optional[int] = None
    roof_sqf: Optional[int] = None
    roofAge: Optional[int] = None
    roof_age: Optional[int] = None
    stories: Optional[Any] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    zip_code: Optional[str] = None
    propertyType: Optional[str] = None
    property_type: Optional[str] = None
    roofType: Optional[str] = None
    roof_type: Optional[str] = None
    hoa: Optional[bool] = None
    notes: Optional[str] = None

class UpdateClientPayload(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    property_type: Optional[str] = None
    roof_type: Optional[str] = None
    roof_sqf: Optional[int] = None
    roof_age: Optional[int] = None
    stories: Optional[Any] = None
    hoa: Optional[bool] = None
    status: Optional[str] = None
    client_category: Optional[str] = None
    lost_reason: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    source_type: Optional[str] = None
    acquired_by_user_id: Optional[int] = None
    lead_source_detail: Optional[str] = None
    client_since: Optional[str] = None

class MarkClientLostPayload(BaseModel):
    lost_reason: Optional[str] = None
    lostReason: Optional[str] = None
    lost_notes: Optional[str] = None
    lostNotes: Optional[str] = None

class AddClientActivityPayload(BaseModel):
    title: str = Field(..., min_length=1)
    activityType: Optional[str] = "note"
    description: Optional[str] = None
    callDuration: Optional[Any] = None

class CreateClientTaskPayload(BaseModel):
    title: str = Field(..., min_length=1)
    dueAt: Optional[str] = None
    dueDate: Optional[str] = None
    priority: Optional[str] = "normal"
    description: Optional[str] = ""
    assignedToUserId: Optional[int] = None
    assignedTo: Optional[str] = None

class AddClientDocumentPayload(BaseModel):
    name: Optional[str] = "Document"
    fileUrl: Optional[str] = None
    url: Optional[str] = None
    fileType: Optional[str] = "document"
    fileSize: Optional[Any] = None
    file_size: Optional[Any] = None

router = APIRouter()

@router.get("/clients")
async def get_clients(
    request: Request,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    tag: Optional[str] = None,
    sort: Optional[str] = "recent",
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=500),
    sync: bool = False,
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    # NOTE: Safe HTTP GET (RFC 9110) - no side-effects/mutations in GET requests.
    page_val = page if isinstance(page, int) else 1
    limit_val = limit if isinstance(limit, int) else 100
    offset = (page_val - 1) * limit_val

    conditions: List[str] = []
    params: Dict[str, Any] = {}

    # Enforce Client Data Scope
    scope = build_scope_filter(
        user=user,
        permission="leads.view",
        creator_col="c.acquired_by_user_id",
        assigned_col="c.acquired_by_user_id",
        param_prefix="client_scope_"
    )
    if not scope["allowed"]:
        return {
            "clients": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "totalPages": 0,
            "counts": {"all": 0, "lead": 0, "new_client": 0, "existing_client": 0, "lost_lead": 0}
        }
    if scope["clause"] != "1=1":
        conditions.append(scope["clause"])
        params.update(scope["params"])

    if category and category != "all":
        target_cat = category
        if target_cat == "leads": target_cat = "lead"
        elif target_cat == "new_clients": target_cat = "new_client"
        elif target_cat == "existing_clients": target_cat = "existing_client"
        elif target_cat == "lost_leads": target_cat = "lost_lead"

        params["target_cat"] = target_cat
        conditions.append("c.client_category = :target_cat")
    elif status and status != "all":
        if status in ("lost", "closed_lost"):
            conditions.append("(c.client_category = 'lost_lead' OR c.status IN ('lost', 'closed_lost') OR c.lost_reason IS NOT NULL)")
        else:
            params["status"] = status
            conditions.append("c.status = :status")

    if tag and tag != "all":
        params["tag"] = tag
        conditions.append(":tag = ANY(c.tags)")

    if search and search.strip():
        s = search.strip().lower()
        norm = normalize_phone(s)
        params["search"] = f"%{s}%"
        if norm and len(norm) >= 4:
            params["norm"] = f"%{norm}%"
            conditions.append("""(
                LOWER(c.full_name) LIKE :search OR
                LOWER(COALESCE(c.email, '')) LIKE :search OR
                LOWER(COALESCE(c.address, '')) LIKE :search OR
                LOWER(COALESCE(c.city, '')) LIKE :search OR
                c.phone_normalized LIKE :norm OR
                c.phone LIKE :search
            )""")
        else:
            conditions.append("""(
                LOWER(c.full_name) LIKE :search OR
                LOWER(COALESCE(c.email, '')) LIKE :search OR
                LOWER(COALESCE(c.address, '')) LIKE :search OR
                LOWER(COALESCE(c.city, '')) LIKE :search OR
                c.phone LIKE :search
            )""")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    order_by = "c.updated_at DESC"
    if sort == "ltv":
        order_by = "c.total_revenue DESC, c.updated_at DESC"
    elif sort == "name":
        order_by = "c.full_name ASC"
    elif sort == "jobs":
        order_by = "c.total_jobs_count DESC, c.updated_at DESC"
    elif sort == "created":
        order_by = "c.created_at DESC"

    clients_query = text(f"""
        SELECT 
            c.*, 
            u.name as assigned_to_name,
            u_acq.name as acquired_by_name,
            u_acq.role as acquired_by_role,
            u_acq.avatar_url as acquired_by_avatar,
            (
                SELECT lost_reason FROM leads 
                WHERE client_id = c.id AND status = 'lost' AND lost_reason IS NOT NULL 
                ORDER BY updated_at DESC LIMIT 1
            ) as lead_lost_reason,
            (
                SELECT total FROM estimates 
                WHERE client_id = c.id OR lead_id IN (SELECT id FROM leads WHERE client_id = c.id) 
                ORDER BY created_at DESC LIMIT 1
            ) as latest_estimate_total
        FROM clients c
        LEFT JOIN users u ON c.assigned_to_user_id = u.id
        LEFT JOIN users u_acq ON c.acquired_by_user_id = u_acq.id
        {where_clause}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """)

    count_query = text(f"SELECT COUNT(*) as count FROM clients c {where_clause}")
    summary_conditions = []
    if scope["clause"] != "1=1":
        summary_conditions.append(scope["clause"])
    summary_where = f"WHERE {' AND '.join(summary_conditions)}" if summary_conditions else ""
    summary_query = text(f"""
        SELECT 
            COUNT(CASE WHEN (c.client_category != 'lost_lead' OR c.client_category IS NULL) AND (c.status IS NULL OR c.status NOT IN ('lost', 'closed_lost')) AND c.lost_reason IS NULL THEN 1 END) as total_clients,
            COUNT(CASE WHEN c.client_category = 'existing_client' OR c.status IN ('active_job', 'completed', 'repeat') THEN 1 END) as existing_clients_count,
            COUNT(CASE WHEN c.client_category = 'new_client' OR (c.client_category != 'existing_client' AND c.client_category != 'lost_lead' AND c.status = 'opportunity') THEN 1 END) as new_clients_count,
            COUNT(CASE WHEN c.client_category = 'lead' OR (c.client_category IS NULL AND c.status = 'lead') THEN 1 END) as leads_count,
            COUNT(CASE WHEN c.client_category = 'lost_lead' OR c.status IN ('lost', 'closed_lost') OR c.lost_reason IS NOT NULL THEN 1 END) as lost_leads_count,
            COUNT(CASE WHEN c.status = 'active_job' THEN 1 END) as active_jobs,
            COALESCE(SUM(CASE WHEN c.client_category != 'lost_lead' AND (c.status IS NULL OR c.status NOT IN ('lost', 'closed_lost')) AND c.lost_reason IS NULL THEN c.total_revenue ELSE 0 END), 0) as total_ltv
        FROM clients c
        {summary_where}
    """)

    params["limit"] = limit_val
    params["offset"] = offset

    clients_res = await db.execute(clients_query, params)
    clients_rows = [dict(r._mapping) for r in clients_res.fetchall()]

    count_res = await db.execute(count_query, params)
    total = count_res.scalar() or 0

    summary_res = await db.execute(summary_query, params)
    s_row = summary_res.first()

    summary = {
        "totalClients": int(s_row.total_clients or 0) if s_row else 0,
        "existingClientsCount": int(s_row.existing_clients_count or 0) if s_row else 0,
        "newClientsCount": int(s_row.new_clients_count or 0) if s_row else 0,
        "leadsCount": int(s_row.leads_count or 0) if s_row else 0,
        "lostLeadsCount": int(s_row.lost_leads_count or 0) if s_row else 0,
        "activeProjects": int(s_row.active_jobs or 0) if s_row else 0,
        "leadCount": int(s_row.leads_count or 0) if s_row else 0,
        "totalLtv": float(s_row.total_ltv or 0) if s_row else 0.0,
    }

    enriched = []
    for c in clients_rows:
        is_team = bool(c.get("acquired_by_user_id") or c.get("acquired_by_name"))
        c_dict = dict(c)
        c_dict["client_category"] = c_dict.get("client_category") or "lead"
        c_dict["lost_reason"] = c_dict.get("lost_reason") or c_dict.get("lead_lost_reason")
        c_dict["latest_estimate_total"] = float(c_dict["latest_estimate_total"]) if c_dict.get("latest_estimate_total") else None
        c_dict["source_type"] = "team_member" if is_team else "website"
        c_dict["lead_source_detail"] = c_dict.get("lead_source_detail") or ("Sales Rep Outreach" if is_team else "Website Inbound")
        enriched.append(c_dict)

    return {
        "ok": True,
        "clients": enriched,
        "total": total,
        "page": page_val,
        "limit": limit_val,
        "totalPages": math.ceil(total / limit_val) if limit_val else 1,
        "summary": summary,
    }

STAGE_LABELS: Dict[str, str] = {
    "cold_lead": "Cold Lead",
    "new_leads": "Cold Lead",
    "initial_call": "Contacted",
    "contacted": "Contacted",
    "estimate_scheduled": "Estimate Scheduled",
    "inspection_scheduled": "Estimate Scheduled",
    "est_scheduled": "Estimate Scheduled",
    "inspection_completed": "Inspection Completed",
    "estimate_building": "Drafting Estimate",
    "estimate_sent": "Estimate Sent",
    "est_sent": "Estimate Sent",
    "follow_up": "Follow-Up",
    "contract_sent": "Contract Sent",
    "contract_signed": "Contract Signed",
    "active_jobs": "Active Job",
    "job_completed": "Job Completed",
    "completed": "Lifetime Warrantied",
    "closed_won": "Closed Won",
}

async def check_contact_conflict(
    db: AsyncSession,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    exclude_client_id: Optional[Any] = None
) -> Optional[Dict[str, Any]]:
    """
    Checks whether a client already exists with the given email or phone number.
    Returns None if no conflict, or a dict with details:
      {
        "field": "email" | "phone",
        "client": {"id": int, "full_name": str, "email": str, "phone": str, "status": str},
        "message": str
      }
    """
    clean_email = email.strip().lower() if email and str(email).strip() else None
    norm_phone = normalize_phone(phone) if phone and str(phone).strip() else None

    clean_exc_id: Optional[int] = None
    if exclude_client_id is not None:
        try:
            s = str(exclude_client_id).strip()
            if s and s.lower() not in ("null", "undefined", "none"):
                clean_exc_id = int(s)
        except (ValueError, TypeError):
            clean_exc_id = None

    # 1. Check Email
    if clean_email:
        email_query = """
            SELECT id, full_name, email, phone, status
            FROM clients
            WHERE LOWER(email) = :email
        """
        params: Dict[str, Any] = {"email": clean_email}
        if clean_exc_id is not None:
            email_query += " AND id != :exc_id"
            params["exc_id"] = clean_exc_id
        email_query += " ORDER BY id ASC LIMIT 1"
        row = (await db.execute(text(email_query), params)).first()
        if row:
            return {
                "field": "email",
                "client": {
                    "id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "phone": row[3],
                    "status": row[4],
                },
                "message": f"A client with this email already exists: '{row[1]}' (Client #{row[0]}). Please use a unique email or edit the existing client profile."
            }

    # 2. Check Phone
    if norm_phone:
        phone_query = """
            SELECT id, full_name, email, phone, status
            FROM clients
            WHERE (
                phone_normalized = :norm
                OR (phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = :norm)
                OR (secondary_phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(secondary_phone, '\\D', '', 'g'), 10) = :norm)
            )
        """
        params = {"norm": norm_phone}
        if clean_exc_id is not None:
            phone_query += " AND id != :exc_id"
            params["exc_id"] = clean_exc_id
        phone_query += " ORDER BY id ASC LIMIT 1"
        row = (await db.execute(text(phone_query), params)).first()
        if row:
            return {
                "field": "phone",
                "client": {
                    "id": row[0],
                    "full_name": row[1],
                    "email": row[2],
                    "phone": row[3],
                    "status": row[4],
                },
                "message": f"A client with this phone number already exists: '{row[1]}' (Client #{row[0]}). Please use a unique phone number or edit the existing client profile."
            }

    return None


@router.get("/clients/check-contact")
@router.get("/clients/check-email")
async def check_client_contact(
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    exclude_client_id: Optional[Any] = Query(None),
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    conflict = await check_contact_conflict(
        db, email=email, phone=phone, exclude_client_id=exclude_client_id
    )
    if conflict:
        return {
            "exists": True,
            "field": conflict["field"],
            "conflict_field": conflict["field"],
            "client": conflict["client"],
            "message": conflict["message"]
        }
    return {
        "exists": False,
        "field": None,
        "conflict_field": None,
        "client": None,
        "message": None
    }


@router.post("/clients")
async def create_client(
    payload: CreateClientPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:create")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    raw_name = payload_dict.get("fullName") or payload_dict.get("full_name") or payload_dict.get("name") or ""
    full_name = format_person_name(raw_name)
    phone = payload_dict.get("phone")
    email = payload_dict.get("email")

    if not full_name or (not phone and not email):
        raise HTTPException(status_code=400, detail="Client name and at least one contact method (phone or email) are required")

    # Prevent duplicate email or phone
    conflict = await check_contact_conflict(db, email=email, phone=phone)
    sec_phone = payload_dict.get("secondaryPhone") or payload_dict.get("secondary_phone")
    if not conflict and sec_phone:
        conflict = await check_contact_conflict(db, phone=sec_phone)
    if conflict:
        raise HTTPException(status_code=400, detail=conflict["message"])

    clean_email = email.strip().lower() if email and str(email).strip() else None
    source_type = "team_member" if payload_dict.get("sourceType") == "team_member" or payload_dict.get("source_type") == "team_member" else "website"
    acquired_by = None
    if source_type == "team_member":
        acq_val = payload_dict.get("acquiredByUserId") or payload_dict.get("acquired_by_user_id")
        acquired_by = int(acq_val) if acq_val else user["id"]
    source_detail = payload_dict.get("leadSourceDetail") or payload_dict.get("lead_source_detail") or ("Team Member Attribution" if source_type == "team_member" else "Manual Office Inbound")

    asgn_val = payload_dict.get("assignedToUserId") or payload_dict.get("assigned_to_user_id")
    sqf_val = payload_dict.get("roofSqf") or payload_dict.get("roof_sqf")
    age_val = payload_dict.get("roofAge") or payload_dict.get("roof_age")
    stories_val = payload_dict.get("stories") or 1
    stories_int = int(stories_val) if str(stories_val).isdigit() else 1

    parsed_addr = parse_address_components(payload_dict.get("address"), payload_dict.get("city"), payload_dict.get("zip") or payload_dict.get("zip_code"))
    clean_address = parsed_addr["address"]
    clean_city = parsed_addr["city"] or payload_dict.get("city") or "Oceanside"
    clean_zip = parsed_addr["zip"] or payload_dict.get("zip") or payload_dict.get("zip_code") or "92054"
    norm_phone = normalize_phone(phone)

    insert_sql = text("""
        INSERT INTO clients (
            full_name, phone, phone_normalized, secondary_phone, email,
            address, city, zip, property_type, roof_type, roof_sqf, roof_age,
            stories, hoa, status, client_category, tags, total_revenue,
            total_jobs_count, notes, assigned_to_user_id, source_type,
            acquired_by_user_id, lead_source_detail, client_since,
            created_at, updated_at
        ) VALUES (
            :name, :phone, :norm_phone, :sec_phone, :email,
            :addr, :city, :zip, :property_type, :roof_type, :sqf, :roof_age,
            :stories, :hoa, 'lead', 'new_client', '{"New Client"}', 0.00,
            0, :notes, :asgn_id, :source_type,
            :acq_id, :src_detail, NOW(),
            NOW(), NOW()
        ) RETURNING id
    """)

    res = await db.execute(insert_sql, {
        "name": full_name,
        "phone": phone,
        "norm_phone": norm_phone,
        "sec_phone": payload_dict.get("secondaryPhone") or payload_dict.get("secondary_phone"),
        "email": clean_email,
        "addr": clean_address,
        "city": clean_city,
        "zip": clean_zip,
        "property_type": payload_dict.get("propertyType") or payload_dict.get("property_type") or "Single Family",
        "roof_type": payload_dict.get("roofType") or payload_dict.get("roof_type"),
        "sqf": int(sqf_val) if sqf_val else None,
        "roof_age": int(age_val) if age_val else None,
        "stories": stories_int,
        "hoa": bool(payload_dict.get("hoa")),
        "notes": payload_dict.get("notes"),
        "asgn_id": int(asgn_val) if asgn_val else None,
        "source_type": source_type,
        "acq_id": acquired_by,
        "src_detail": source_detail
    })
    client_id = res.scalar_one()

    try:
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                VALUES ('client', :cid, :cid, 'system', 'Client Profile Created', 'Manual client profile setup by staff', :performer)
            """),
            {"cid": client_id, "performer": user.get("name") or "Staff"}
        )
        await db.commit()
    except Exception:
        pass

    return {"ok": True, "client": {"id": client_id, "full_name": full_name}}


@router.post("/clients/existing")
async def create_existing_client(
    payload: CreateExistingClientRequest,
    user: Dict[str, Any] = Depends(require_permission("clients:create")),
    db: AsyncSession = Depends(get_db)
):
    """
    Onboard an existing homeowner at any stage of the pipeline with full
    property/roof specs, historical context, contract value, and staff attribution.
    Atomically creates and syncs:
      1. 'clients' row (client_category='existing_client', status matched to stage)
      2. 'leads' row (sales pipeline card at target stage)
      3. 'jobs' row (if in production or completed lifetime warranty)
      4. 'activities' entry documenting who added the homeowner and the initial stage
    """
    full_name = format_person_name(payload.full_name)
    if not full_name or len(full_name) < 2:
        raise HTTPException(status_code=400, detail="Homeowner full name is required (at least 2 characters)")
    if not payload.phone and not payload.email:
        raise HTTPException(status_code=400, detail="At least one contact method (phone or email) are required")

    # 1. Prevent duplicate email or phone number across existing clients
    conflict = await check_contact_conflict(db, email=payload.email, phone=payload.phone)
    if not conflict and payload.secondary_phone:
        conflict = await check_contact_conflict(db, phone=payload.secondary_phone)
    if conflict:
        raise HTTPException(status_code=400, detail=conflict["message"])

    # 2. Address & Phone Sanitization
    parsed_addr = parse_address_components(payload.address, payload.city, payload.zip)
    clean_address = parsed_addr["address"]
    clean_city = parsed_addr["city"] or payload.city or "Oceanside"
    clean_zip = parsed_addr["zip"] or payload.zip or "92054"
    clean_email = payload.email.strip().lower() if payload.email and payload.email.strip() else None
    norm_phone = normalize_phone(payload.phone)

    # 2. Staff Attribution & Assignment
    staff_id = user["id"]
    staff_name = user.get("name") or "Staff"
    roles_list = user.get("roles", [])
    if roles_list and isinstance(roles_list, list):
        staff_role = ", ".join([r.get("name", "Staff") if isinstance(r, dict) else str(r) for r in roles_list])
    else:
        staff_role = user.get("role") or "Staff"

    assigned_rep_id = payload.assigned_to_user_id or staff_id
    assigned_name = staff_name
    if payload.assigned_to_user_id and payload.assigned_to_user_id != staff_id:
        rep_row = (await db.execute(text("SELECT name FROM users WHERE id = :uid"), {"uid": payload.assigned_to_user_id})).first()
        if rep_row:
            assigned_name = rep_row[0]

    lead_source_detail = payload.lead_source_detail or f"Staff Onboarding by {staff_name} ({staff_role})"

    # 3. Stage Resolution
    target_stage = (payload.pipeline_stage or "active_jobs").strip().lower()
    stage_label = STAGE_LABELS.get(target_stage, target_stage.replace('_', ' ').title())

    is_active_job = target_stage == "active_jobs"
    is_completed = target_stage in ("completed", "closed_won", "job_completed")
    is_production = is_active_job or is_completed

    if is_active_job:
        client_status = "active_job"
    elif is_completed:
        client_status = "completed"
    else:
        client_status = "opportunity"

    contract_val = float(payload.contract_value or 0.0)
    total_rev = contract_val if (is_completed or is_active_job) else 0.0
    jobs_cnt = 1 if is_production else 0

    stories_int = int(payload.stories) if str(payload.stories).isdigit() else 1

    client_since_dt = None
    if payload.client_since:
        if isinstance(payload.client_since, datetime):
            client_since_dt = payload.client_since
        else:
            try:
                client_since_dt = datetime.fromisoformat(str(payload.client_since).replace("Z", "+00:00"))
            except Exception:
                client_since_dt = None

    client_tags = ["Existing Client"]
    if is_active_job:
        client_tags.append("Active Project")
    elif is_completed:
        client_tags.append("Completed Project")

    # 4. Insert Brand New Independent Client Record (never overwrite existing clients)
    insert_client_stmt = text("""
        INSERT INTO clients (
            full_name, phone, phone_normalized, secondary_phone, email,
            address, city, zip, property_type, roof_type, roof_sqf, roof_age,
            stories, hoa, status, client_category, tags, total_revenue,
            total_jobs_count, notes, assigned_to_user_id, source_type,
            acquired_by_user_id, lead_source_detail, client_since,
            created_at, updated_at
        ) VALUES (
            :name, :phone, :norm_phone, :sec_phone, :email,
            :addr, :city, :zip, :property_type, :roof_type, :sqf, :roof_age,
            :stories, :hoa, :status, 'existing_client', :tags, :rev,
            :jobs_cnt, :notes, :asgn_id, 'team_member',
            :acq_id, :src_detail, COALESCE(:client_since, NOW()),
            NOW(), NOW()
        ) RETURNING id
    """)

    res = await db.execute(insert_client_stmt, {
        "name": payload.full_name.strip(),
        "phone": payload.phone,
        "norm_phone": norm_phone,
        "sec_phone": payload.secondary_phone,
        "email": clean_email,
        "addr": clean_address,
        "city": clean_city,
        "zip": clean_zip,
        "property_type": payload.property_type or "Single Family",
        "roof_type": payload.roof_type,
        "sqf": payload.roof_sqf,
        "roof_age": payload.roof_age,
        "stories": stories_int,
        "hoa": bool(payload.hoa),
        "status": client_status,
        "tags": client_tags,
        "rev": total_rev,
        "jobs_cnt": jobs_cnt,
        "acq_id": staff_id,
        "asgn_id": assigned_rep_id,
        "src_detail": lead_source_detail,
        "client_since": client_since_dt,
        "notes": payload.notes,
    })
    client_id = res.scalar_one()

    # 5. Staging in Leads Table (Sales Pipeline Sync)
    if is_production or target_stage == "contract_signed":
        lead_status = "won"
    elif target_stage in ("cold_lead", "new_leads"):
        lead_status = "new"
    else:
        lead_status = "contacted"

    lead_pipeline_stage = "closed_won" if target_stage == "completed" else target_stage

    lead_stmt = text("""
        INSERT INTO leads (
            client_id, form_type, full_name, phone, email, address, city, zip,
            service_type, notes, status, priority, pipeline_stage,
            lead_source, source_type, lead_source_detail,
            roof_sqf, roof_type, stories,
            assigned_to_user_id, assigned_to,
            created_by_user_id, created_by, created_by_role_snapshot,
            estimated_value, created_at, updated_at
        ) VALUES (
            :cid, 'existing_homeowner', :name, :phone, :email, :addr, :city, :zip,
            :svc, :notes, :status, 'cool', :stage,
            'existing_client', 'team_member', :src_detail,
            :sqf, :roof_type, :stories,
            :asgn_uid, :asgn_name,
            :creator_uid, :creator_uid, :creator_role,
            :val, NOW(), NOW()
        ) RETURNING id
    """)
    lead_res = await db.execute(lead_stmt, {
        "cid": client_id,
        "name": payload.full_name,
        "phone": payload.phone,
        "email": payload.email,
        "addr": clean_address,
        "city": clean_city,
        "zip": clean_zip,
        "svc": payload.service_type or "Roof Replacement",
        "notes": payload.notes,
        "status": lead_status,
        "stage": lead_pipeline_stage,
        "src_detail": lead_source_detail,
        "sqf": payload.roof_sqf,
        "roof_type": payload.roof_type,
        "stories": stories_int,
        "asgn_uid": assigned_rep_id,
        "asgn_name": assigned_name,
        "creator_uid": staff_id,
        "creator_role": staff_role,
        "val": contract_val
    })
    lead_id = lead_res.scalar()

    # 6. Production / Completed Job Creation
    created_job_id = None
    created_job_num = None
    if is_production:
        year = datetime.now(timezone.utc).year
        count_res = await db.execute(text("SELECT COUNT(*) FROM jobs"))
        seq = str(int(count_res.scalar() or 0) + 1).zfill(4)
        job_number = f"JOB-{year}-{seq}"
        job_status = "completed" if is_completed else "in_progress"

        job_stmt = text("""
            INSERT INTO jobs (
                lead_id, client_id, job_number, status, stage, customer_name, customer_phone, customer_email,
                address, city, zip, service_type, contract_value, notes,
                assigned_to, assigned_to_user_id, created_by, created_by_role_snapshot,
                created_at, updated_at
            ) VALUES (
                :lid, :cid, :job_num, :status, :stage, :name, :phone, :email,
                :addr, :city, :zip, :svc, :val, :notes,
                :asgn_name, :asgn_uid, :creator_uid, :creator_role,
                NOW(), NOW()
            ) RETURNING id, job_number
        """)
        job_res = await db.execute(job_stmt, {
            "lid": lead_id,
            "cid": client_id,
            "job_num": job_number,
            "status": job_status,
            "stage": target_stage,
            "name": payload.full_name,
            "phone": payload.phone,
            "email": payload.email,
            "addr": clean_address,
            "city": clean_city,
            "zip": clean_zip,
            "svc": payload.service_type or "Roof Replacement",
            "val": contract_val,
            "notes": payload.notes,
            "asgn_name": assigned_name,
            "asgn_uid": assigned_rep_id,
            "creator_uid": staff_id,
            "creator_role": staff_role
        })
        job_row = job_res.first()
        if job_row:
            created_job_id = job_row[0]
            created_job_num = job_row[1]

    # 7. Activity Audit Trail Entry
    val_note = f" • Value: ${contract_val:,.2f}" if contract_val > 0 else ""
    await db.execute(text("""
        INSERT INTO activities (
            entity_type, entity_id, client_id, activity_type,
            title, description, performed_by, user_id, user_name
        ) VALUES (
            'client', :cid, :cid, 'system',
            :title, :desc, :performer, :uid, :uname
        )
    """), {
        "cid": client_id,
        "title": f"Existing Homeowner Added ({stage_label})",
        "desc": f"Onboarded by {staff_name} ({staff_role}) at '{stage_label}' stage{val_note}. {payload.notes or ''}".strip(),
        "performer": staff_name,
        "uid": staff_id,
        "uname": staff_name
    })

    # 8. Recalculate Client Stats and Commit Transaction
    try:
        await recalculate_client_stats(db, client_id)
        await db.commit()
    except Exception:
        await db.commit()

    return {
        "ok": True,
        "client": {
            "id": client_id,
            "full_name": payload.full_name,
            "phone": payload.phone,
            "email": payload.email,
            "address": clean_address,
            "city": clean_city,
            "zip": clean_zip,
            "status": client_status,
            "client_category": "existing_client",
            "acquired_by_name": staff_name,
            "acquired_by_role": staff_role,
        },
        "lead": {"id": lead_id, "pipeline_stage": target_stage} if lead_id else None,
        "job": {"id": created_job_id, "job_number": created_job_num} if is_production else None,
        "message": f"Successfully onboarded {payload.full_name} at '{stage_label}' stage."
    }

@router.get("/clients/{client_id}")
async def get_client_360(
    client_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    c_res = await db.execute(
        text("""
            SELECT 
                c.*, 
                u.name as assigned_to_name, 
                u.email as assigned_to_email,
                u_acq.name as acquired_by_name,
                u_acq.role as acquired_by_role,
                u_acq.avatar_url as acquired_by_avatar
            FROM clients c
            LEFT JOIN users u ON c.assigned_to_user_id = u.id
            LEFT JOIN users u_acq ON c.acquired_by_user_id = u_acq.id
            WHERE c.id = :id
        """),
        {"id": client_id}
    )
    client_row = c_res.first()
    if not client_row:
        raise HTTPException(status_code=404, detail="Client not found")

    client = dict(client_row._mapping)
    if not check_resource_access(user, "clients.view", creator_id=client.get("acquired_by_user_id"), assigned_id=client.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to access this client")

    is_team = bool(client.get("acquired_by_user_id") or client.get("acquired_by_name"))
    client["source_type"] = "team_member" if is_team else "website"
    client["lead_source_detail"] = client.get("lead_source_detail") or ("Sales Rep Outreach" if is_team else "Website Inbound")

    clean_phone = client.get("phone") or "__NONE__"
    clean_norm = client.get("phone_normalized") or "__NONE__"
    clean_email = client.get("email").lower() if client.get("email") else "__NONE__"

    # Fetch related entities. A single AsyncSession cannot run statements concurrently, so the
    # queries are serialised through a lock (gather is kept only to preserve the call structure).
    db_lock = asyncio.Lock()

    async def _q(stmt, params=None):
        async with db_lock:
            res = await db.execute(stmt, params or {})
            return [dict(r._mapping) for r in res.fetchall()]

    (
        leads,
        inspections,
        estimates,
        jobs,
        invoices,
        warranties,
        reviews,
        activities,
        tasks,
        documents,
    ) = await asyncio.gather(
        _q(text("""
        SELECT * FROM leads 
        WHERE client_id = :id 
           OR (phone IS NOT NULL AND :phone != '__NONE__' AND (phone = :phone OR phone = :norm))
           OR (email IS NOT NULL AND :email != '__NONE__' AND LOWER(email) = :email)
        ORDER BY created_at DESC
    """), {"id": client_id, "phone": clean_phone, "norm": clean_norm, "email": clean_email}),
        _q(text("""
        SELECT ins.*, j.job_number 
        FROM inspections ins
        LEFT JOIN jobs j ON ins.job_id = j.id
        WHERE ins.client_id = :id 
           OR ins.lead_id IN (SELECT id FROM leads WHERE client_id = :id)
           OR ins.job_id IN (SELECT id FROM jobs WHERE client_id = :id)
        ORDER BY ins.inspection_date DESC, ins.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT e.*, l.status as lead_status
        FROM estimates e
        LEFT JOIN leads l ON e.lead_id = l.id
        WHERE e.client_id = :id 
           OR e.lead_id IN (SELECT id FROM leads WHERE client_id = :id)
        ORDER BY e.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT j.*, e.estimate_number, u1.name as pm_name, u2.name as foreman_name
        FROM jobs j
        LEFT JOIN estimates e ON j.estimate_id = e.id
        LEFT JOIN users u1 ON j.project_manager_id = u1.id
        LEFT JOIN users u2 ON j.foreman_id = u2.id
        WHERE j.client_id = :id 
           OR j.lead_id IN (SELECT id FROM leads WHERE client_id = :id)
        ORDER BY j.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT i.*, j.job_number, j.status as job_status
        FROM invoices i
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.client_id = :id 
           OR i.job_id IN (SELECT id FROM jobs WHERE client_id = :id)
           OR i.estimate_id IN (SELECT id FROM estimates WHERE client_id = :id)
        ORDER BY i.due_date ASC, i.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT w.*, j.job_number, j.service_type as job_service_type
        FROM warranties w
        LEFT JOIN jobs j ON w.job_id = j.id
        WHERE w.client_id = :id 
           OR w.job_id IN (SELECT id FROM jobs WHERE client_id = :id)
        ORDER BY w.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT r.*, j.job_number 
        FROM reviews r
        LEFT JOIN jobs j ON r.job_id = j.id
        WHERE r.client_id = :id 
           OR r.lead_id IN (SELECT id FROM leads WHERE client_id = :id)
           OR r.job_id IN (SELECT id FROM jobs WHERE client_id = :id)
        ORDER BY r.created_at DESC
    """), {"id": client_id}),
        _q(text("""
        SELECT DISTINCT ON (a.id) a.*
        FROM activities a
        WHERE a.client_id = :id
           OR (a.entity_type = 'client' AND a.entity_id = :id)
           OR (a.entity_type = 'lead' AND a.entity_id IN (SELECT id FROM leads WHERE client_id = :id))
           OR (a.entity_type = 'job' AND a.entity_id IN (SELECT id FROM jobs WHERE client_id = :id))
        ORDER BY a.id, a.created_at DESC
        LIMIT 100
    """), {"id": client_id}),
        _q(text("""
        SELECT DISTINCT ON (t.id) t.*
        FROM tasks t
        WHERE t.client_id = :id
           OR (t.entity_type = 'client' AND t.entity_id = :id)
           OR (t.entity_type = 'lead' AND t.entity_id IN (SELECT id FROM leads WHERE client_id = :id))
           OR (t.entity_type = 'job' AND t.entity_id IN (SELECT id FROM jobs WHERE client_id = :id))
        ORDER BY t.id, t.completed_at NULLS FIRST, t.due_at ASC
    """), {"id": client_id}),
        _q(text("""
        SELECT * FROM client_documents WHERE client_id = :id ORDER BY created_at DESC
    """), {"id": client_id})
    )

    activities.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)

    # Extract inspection & drone photos from inspections findings or attached data
    inspection_photos = []
    for ins in inspections:
        findings = ins.get("findings")
        if isinstance(findings, list):
            for item in findings:
                if isinstance(item, dict) and item.get("photo_url"):
                    inspection_photos.append({
                        "id": f"insp-{ins.get('id')}-{len(inspection_photos)}",
                        "title": item.get("title") or item.get("category") or "Inspection Photo",
                        "url": item.get("photo_url"),
                        "severity": item.get("status") or "Inspected",
                        "createdAt": str(ins.get("inspection_date") or ins.get("created_at") or "")
                    })
        if ins.get("photo_url"):
            inspection_photos.append({
                "id": f"insp-{ins.get('id')}",
                "title": f"Roof Health Score: {ins.get('roof_health_score', 85)}%",
                "url": ins.get("photo_url"),
                "severity": "Inspected",
                "createdAt": str(ins.get("inspection_date") or ins.get("created_at") or "")
            })

    # Enrich invoices with parsed line items and payment records
    if invoices:
        inv_ids = [inv["id"] for inv in invoices]
        async with db_lock:
            p_res = await db.execute(text("""
                SELECT p.*, u.name as recorded_by_name
                FROM payments p
                LEFT JOIN users u ON p.recorded_by = u.id
                WHERE p.invoice_id = ANY(:ids)
                ORDER BY p.payment_date DESC, p.created_at DESC
            """), {"ids": inv_ids})
            all_payments = [dict(r._mapping) for r in p_res.fetchall()]

        payments_by_inv = {}
        for p in all_payments:
            payments_by_inv.setdefault(p["invoice_id"], []).append(p)

        for inv in invoices:
            inv["payments"] = payments_by_inv.get(inv["id"], [])
            if inv.get("line_items") and isinstance(inv["line_items"], str):
                try:
                    inv["line_items"] = json.loads(inv["line_items"])
                except Exception:
                    pass

    total_billed = sum(float(inv.get("amount") or 0) for inv in invoices)
    total_paid_from_payments = sum(
        sum(float(p.get("amount") or 0) for p in inv.get("payments", []) if p.get("status") == "completed")
        for inv in invoices
    )
    total_paid_from_invoices = sum(
        float(inv.get("amount") or 0) for inv in invoices if inv.get("status") == "paid" and not inv.get("payments")
    )
    total_paid = total_paid_from_payments + total_paid_from_invoices
    balance_due = max(0.0, total_billed - total_paid)

    client["balance_due"] = balance_due
    client["total_billed"] = total_billed
    client["total_paid"] = total_paid

    return {
        "ok": True,
        "client": client,
        "leads": leads,
        "inspections": inspections,
        "inspection_photos": inspection_photos,
        "documents": documents,
        "media": documents,
        "estimates": estimates,
        "jobs": jobs,
        "invoices": invoices,
        "warranties": warranties,
        "reviews": reviews,
        "activities": activities,
        "tasks": tasks,
    }

@router.patch("/clients/{client_id}")
async def update_client(
    client_id: int,
    payload: UpdateClientPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    existing = (await db.execute(text("SELECT id, acquired_by_user_id, assigned_to_user_id FROM clients WHERE id = :id"), {"id": client_id})).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    if not check_resource_access(user, "clients.edit", creator_id=existing.get("acquired_by_user_id"), assigned_id=existing.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to edit this client")

    allowed_fields = [
        "full_name", "phone", "email", "secondary_phone", "address", "city",
        "zip", "property_type", "roof_type", "roof_sqf", "roof_age", "stories",
        "hoa", "status", "client_category", "lost_reason", "tags", "notes", "assigned_to_user_id", "source_type",
        "acquired_by_user_id", "lead_source_detail", "client_since"
    ]

    int_fields = ["roof_sqf", "roof_age", "stories", "assigned_to_user_id", "acquired_by_user_id"]
    bool_fields = ["hoa"]

    # Parse address components if any address field is provided
    if any(k in payload_dict for k in ["address", "city", "zip"]):
        parsed_addr = parse_address_components(
            payload_dict.get("address"),
            payload_dict.get("city"),
            payload_dict.get("zip")
        )
        if "address" in payload_dict:
            payload_dict["address"] = parsed_addr["address"]
        if "city" in payload_dict:
            payload_dict["city"] = parsed_addr["city"]
        if "zip" in payload_dict:
            payload_dict["zip"] = parsed_addr["zip"]

    updates = []
    params: Dict[str, Any] = {"id": client_id}

    for key in allowed_fields:
        if key in payload_dict:
            val = payload_dict[key]
            if key in int_fields:
                val = int(val) if val not in (None, "", "null") else None
            elif key in bool_fields:
                val = bool(val)
            elif isinstance(val, str) and val.strip() == "":
                val = None
            elif isinstance(val, str):
                val = val.strip()
                if key == "full_name":
                    val = format_person_name(val)
                elif key == "email":
                    val = val.lower()
                    if val:
                        existing_email_match = (await db.execute(
                            text("SELECT id, full_name FROM clients WHERE LOWER(email) = :email AND id != :id LIMIT 1"),
                            {"email": val, "id": client_id}
                        )).first()
                        if existing_email_match:
                            raise HTTPException(
                                status_code=400,
                                detail=f"A client with this email already exists: '{existing_email_match[1]}' (Client #{existing_email_match[0]}). Please use a unique email."
                            )

            params[key] = val
            updates.append(f"{key} = :{key}")

            if key in ("phone", "secondary_phone"):
                norm = normalize_phone(val)
                if norm:
                    existing_phone_match = (await db.execute(
                        text("""
                            SELECT id, full_name FROM clients
                            WHERE (
                                phone_normalized = :norm
                                OR (phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = :norm)
                                OR (secondary_phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(secondary_phone, '\\D', '', 'g'), 10) = :norm)
                            ) AND id != :id LIMIT 1
                        """),
                        {"norm": norm, "id": client_id}
                    )).first()
                    if existing_phone_match:
                        raise HTTPException(
                            status_code=400,
                            detail=f"A client with this phone number already exists: '{existing_phone_match[1]}' (Client #{existing_phone_match[0]}). Please use a unique phone number."
                        )
                if key == "phone":
                    params["norm_phone"] = norm
                    updates.append("phone_normalized = :norm_phone")

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    updates.append("updated_at = NOW()")

    stmt = text(f"UPDATE clients SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")

    # Synchronize contact details, address & notes updates back to associated leads so Client 360 is the source of truth
    contact_fields = ["full_name", "email", "phone", "address", "city", "zip", "notes"]
    if any(k in payload_dict for k in contact_fields):
        lead_sync_updates = []
        lead_sync_params = {"cid": client_id}
        for k in contact_fields:
            if k in params and k in payload_dict:
                lead_sync_updates.append(f"{k} = :{k}")
                lead_sync_params[k] = params[k]
        if lead_sync_updates:
            lead_sync_updates.append("updated_at = NOW()")
            await db.execute(
                text(f"UPDATE leads SET {', '.join(lead_sync_updates)} WHERE client_id = :cid"),
                lead_sync_params
            )

    # Synchronize roof specs (roof_sqf, roof_type, stories) to associated leads
    # and recalculate estimated_value so all value views stay consistent
    roof_spec_fields = ["roof_sqf", "roof_type", "stories"]
    if any(k in payload_dict for k in roof_spec_fields):
        lead_roof_updates = []
        lead_roof_params = {"cid": client_id}
        for k in roof_spec_fields:
            if k in payload_dict and payload_dict[k] is not None:
                lead_roof_updates.append(f"{k} = :{k}")
                lead_roof_params[k] = payload_dict[k]
                if k == "roof_sqf":
                    # Also keep roof_squares in sync
                    lead_roof_updates.append("roof_squares = :roof_squares_sync")
                    lead_roof_params["roof_squares_sync"] = round(float(payload_dict[k]) / 100.0, 1)
        if lead_roof_updates and payload_dict.get("roof_sqf"):
            # Recalculate estimated_value from the new sq ft for leads that
            # don't yet have a formal estimate or contract value
            try:
                from app.services.calculator import calculate_lead_estimated_value
                sqf = float(payload_dict["roof_sqf"])
                svc_row = await db.execute(
                    text("SELECT service_type, roof_pitch, stories FROM leads WHERE client_id = :cid ORDER BY id DESC LIMIT 1"),
                    {"cid": client_id}
                )
                svc_data = svc_row.mappings().first()
                svc = (svc_data.get("service_type") if svc_data else None) or "Residential Roofing"
                pitch = (svc_data.get("roof_pitch") if svc_data else None) or "4:12"
                sto = int(svc_data.get("stories") if svc_data else 1) or 1
                calc = calculate_lead_estimated_value(sqf, svc, pitch, sto)
                calc_val = float(calc["estimated_value"])
                # Only overwrite estimated_value when no formal estimate has been sent
                # (i.e. estimate_total is still null — preserve formal estimates)
                lead_roof_updates.append("estimated_value = CASE WHEN (SELECT e.total FROM estimates e WHERE e.lead_id = leads.id OR e.client_id = leads.client_id ORDER BY e.id DESC LIMIT 1) IS NULL THEN :new_est_val ELSE estimated_value END")
                lead_roof_params["new_est_val"] = calc_val
            except Exception:
                pass  # If calculator fails, still sync the sqf field
        if lead_roof_updates:
            lead_roof_updates.append("updated_at = NOW()")
            await db.execute(
                text(f"UPDATE leads SET {', '.join(lead_roof_updates)} WHERE client_id = :cid"),
                lead_roof_params
            )

    # Commit the primary updates (client + lead sync) before optional side-effects
    await db.commit()

    # Optional: activity log + stats recalculation (failures must not roll back the commit above)
    try:
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                VALUES ('client', :id, :id, 'note', 'Client Profile Updated', :desc, :performer)
            """),
            {
                "id": client_id,
                "desc": f"Updated: {', '.join(payload_dict.keys())}",
                "performer": user.get("name") or "Staff"
            }
        )
        await recalculate_client_stats(db, client_id)
        await db.commit()
    except Exception:
        pass

    return {"ok": True, "client": dict(row._mapping)}


@router.delete("/clients/{client_id}")
async def archive_client(
    client_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:delete")),
    db: AsyncSession = Depends(get_db)
):
    existing = (await db.execute(text("SELECT id, acquired_by_user_id, assigned_to_user_id FROM clients WHERE id = :id"), {"id": client_id})).mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Client not found")
    if not check_resource_access(user, "clients.delete", creator_id=existing.get("acquired_by_user_id"), assigned_id=existing.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to delete this client")

    await db.execute(
        text("UPDATE clients SET status = 'inactive', updated_at = NOW() WHERE id = :id"),
        {"id": client_id}
    )
    await db.execute(
        text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
            VALUES ('client', :id, :id, 'system', 'Client Archived', 'Client marked as inactive', :performer)
        """),
        {"id": client_id, "performer": user.get("name") or "Staff"}
    )
    await db.commit()
    return {"ok": True, "message": "Client archived"}

@router.post("/clients/{client_id}/mark-lost")
async def mark_client_as_lost(
    client_id: int,
    payload: MarkClientLostPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a client as a lost opportunity.
    Atomically:
      1. Sets client_category = 'lost_lead' on the clients row
      2. Marks all linked active leads as lost with the provided reason/notes
      3. Logs an activity entry
    """
    payload_dict = payload.model_dump(exclude_unset=True)
    lost_reason = payload_dict.get("lost_reason") or payload_dict.get("lostReason")
    lost_notes  = payload_dict.get("lost_notes")  or payload_dict.get("lostNotes")

    if not lost_reason:
        raise HTTPException(status_code=400, detail="lost_reason is required")

    performer = user.get("name") or "Staff"

    # 1. Update client category
    client_row = (await db.execute(
        text("SELECT id, full_name, acquired_by_user_id, assigned_to_user_id FROM clients WHERE id = :id"),
        {"id": client_id}
    )).mappings().first()
    if not client_row:
        raise HTTPException(status_code=404, detail="Client not found")
    if not check_resource_access(user, "clients.edit", creator_id=client_row.get("acquired_by_user_id"), assigned_id=client_row.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Forbidden: You do not have permission to edit this client")

    await db.execute(
        text("""
            UPDATE clients
            SET client_category = 'lost_lead',
                status = 'closed_lost',
                lost_reason = :reason,
                notes = COALESCE(CAST(:notes AS TEXT), notes),
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": client_id, "reason": lost_reason, "notes": (lost_notes.strip() if lost_notes and lost_notes.strip() else None)}
    )

    # 2. Mark all linked active leads as lost
    leads_result = await db.execute(
        text("SELECT id FROM leads WHERE client_id = :cid AND status != 'lost'"),
        {"cid": client_id}
    )
    lead_ids = [r["id"] for r in leads_result.mappings()]

    for lead_id in lead_ids:
        await db.execute(
            text("""
                UPDATE leads
                SET status       = 'lost',
                    lost_reason  = :reason,
                    lost_notes   = :notes,
                    lost_at      = COALESCE(lost_at, NOW()),
                    updated_at   = NOW()
                WHERE id = :id
            """),
            {"id": lead_id, "reason": lost_reason, "notes": lost_notes}
        )

    # 3. Log activity on the client
    await db.execute(
        text("""
            INSERT INTO activities (
                entity_type, entity_id, client_id, activity_type,
                title, description, performed_by, user_id, user_name
            ) VALUES (
                'client', :id, :id, 'status_change',
                :title, :desc, :performer, :uid, :uname
            )
        """),
        {
            "id":        client_id,
            "title":     f"Opportunity Marked as Lost: {lost_reason}",
            "desc":      lost_notes or "Client marked as lost opportunity.",
            "performer": performer,
            "uid":       user.get("id"),
            "uname":     performer,
        }
    )

    await db.commit()
    return {
        "ok": True,
        "client_id": client_id,
        "leads_updated": len(lead_ids),
        "lost_reason": lost_reason,
    }



@router.post("/clients/{client_id}/activities")
async def add_client_activity(
    client_id: int,
    payload: AddClientActivityPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    title = payload_dict.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Activity title is required")

    activity_type = payload_dict.get("activityType", "note")
    desc = payload_dict.get("description")
    call_dur = int(payload_dict["callDuration"]) if payload_dict.get("callDuration") else None

    stmt = text("""
        INSERT INTO activities (
            entity_type, entity_id, client_id, activity_type, title, description,
            performed_by, user_id, user_name, call_duration, metadata
        ) VALUES (
            'client', :id, :id, :atype, :title, :desc,
            :pby, :uid, :uname, :dur, :meta
        ) RETURNING *
    """)
    res = await db.execute(stmt, {
        "id": client_id,
        "atype": activity_type,
        "title": title,
        "desc": desc,
        "pby": user.get("name") or "Staff",
        "uid": user["id"],
        "uname": user.get("name") or "Staff",
        "dur": call_dur,
        "meta": None
    })
    row = res.first()
    await db.execute(text("UPDATE clients SET updated_at = NOW() WHERE id = :id"), {"id": client_id})
    await db.commit()

    return {"ok": True, "activity": dict(row._mapping) if row else None}

@router.get("/clients/{client_id}/tasks")
async def get_client_tasks(
    client_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    stmt = text("""
        SELECT t.*, u.name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        WHERE t.client_id = :id
           OR (t.entity_type = 'client' AND t.entity_id = :id)
           OR (t.entity_type = 'lead' AND t.entity_id IN (SELECT id FROM leads WHERE client_id = :id))
        ORDER BY t.completed_at NULLS FIRST, t.due_at ASC
    """)
    res = await db.execute(stmt, {"id": client_id})
    tasks = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "tasks": tasks}

@router.post("/clients/{client_id}/tasks")
async def create_client_task(
    client_id: int,
    payload: CreateClientTaskPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    title = payload_dict.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")

    due_at_raw = payload_dict.get("dueAt") or payload_dict.get("dueDate")
    if due_at_raw:
        if isinstance(due_at_raw, datetime):
            due_at = due_at_raw
        else:
            try:
                due_at = datetime.fromisoformat(str(due_at_raw).replace("Z", "+00:00"))
            except Exception:
                due_at = datetime.now(timezone.utc)
    else:
        due_at = datetime.now(timezone.utc)

    priority = payload_dict.get("priority", "normal")
    desc = payload_dict.get("description", "")
    assigned_to_uid = int(payload_dict["assignedToUserId"]) if payload_dict.get("assignedToUserId") else user["id"]
    assigned_name = payload_dict.get("assignedTo") or user.get("name") or "Staff"

    stmt = text("""
        INSERT INTO tasks (
            client_id, entity_type, entity_id, title, description,
            assigned_to, assigned_to_user_id, created_by_user_id,
            event_type, due_at, priority, created_at
        ) VALUES (
            :cid, 'client', :cid, :title, :desc,
            :assigned_name, :assigned_uid, :uid,
            'task', :due_at, :priority, NOW()
        ) RETURNING *
    """)
    res = await db.execute(stmt, {
        "cid": client_id,
        "title": title,
        "desc": desc,
        "assigned_name": assigned_name,
        "assigned_uid": assigned_to_uid,
        "uid": user["id"],
        "due_at": due_at,
        "priority": priority,
    })
    row = res.first()
    await db.commit()
    return {"ok": True, "task": dict(row._mapping) if row else None}

@router.put("/clients/{client_id}/tasks/{task_id}")
async def toggle_client_task(
    client_id: int,
    task_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    stmt = text("""
        UPDATE tasks
        SET completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE NULL END
        WHERE id = :task_id AND (client_id = :cid OR entity_id = :cid)
        RETURNING *
    """)
    res = await db.execute(stmt, {"task_id": task_id, "cid": client_id})
    row = res.first()
    if not row:
        res = await db.execute(text("""
            UPDATE tasks
            SET completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE NULL END
            WHERE id = :task_id
            RETURNING *
        """), {"task_id": task_id})
        row = res.first()
    await db.commit()
    return {"ok": True, "task": dict(row._mapping) if row else None}

@router.get("/clients/{client_id}/documents")
async def get_client_documents(
    client_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(text("""
        SELECT * FROM client_documents WHERE client_id = :id ORDER BY created_at DESC
    """), {"id": client_id})
    docs = [dict(r._mapping) for r in res.fetchall()]
    return {"ok": True, "documents": docs}

@router.post("/clients/{client_id}/documents")
async def add_client_document(
    client_id: int,
    payload: AddClientDocumentPayload,
    user: Dict[str, Any] = Depends(require_permission("clients:edit")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    name = payload_dict.get("name") or "Document"
    file_url = payload_dict.get("fileUrl") or payload_dict.get("url")
    if not file_url:
        raise HTTPException(status_code=400, detail="File URL is required")

    file_type = payload_dict.get("fileType", "document")
    raw_size = payload_dict.get("fileSize") or payload_dict.get("file_size") or ""
    file_size = str(raw_size)

    stmt = text("""
        INSERT INTO client_documents (client_id, name, file_url, file_type, file_size, uploaded_by, created_at)
        VALUES (:cid, :name, :url, :ftype, :fsize, :upby, NOW())
        RETURNING *
    """)
    res = await db.execute(stmt, {
        "cid": client_id,
        "name": name,
        "url": file_url,
        "ftype": file_type,
        "fsize": file_size,
        "upby": user.get("name") or "Staff"
    })
    row = res.first()
    await db.commit()
    return {"ok": True, "document": dict(row._mapping) if row else None}

@router.post("/clients/{client_id}/media/upload")
@router.post("/clients/{client_id}/upload")
async def upload_client_media(
    client_id: int,
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    all_files: List[UploadFile] = []
    if file:
        all_files.append(file)
    if files:
        all_files.extend(files)

    if not all_files:
        raise HTTPException(status_code=400, detail="No files provided for upload")

    # Verify client exists
    c_res = await db.execute(text("SELECT id, full_name FROM clients WHERE id = :id"), {"id": client_id})
    client_row = c_res.first()
    if not client_row:
        raise HTTPException(status_code=404, detail="Client not found")

    user_name = user.get("name") or user.get("email") or "Staff"
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "clients", str(client_id))
    os.makedirs(upload_dir, exist_ok=True)

    uploaded_docs = []
    for f in all_files:
        original_name = f.filename or "media_upload"
        ext = os.path.splitext(original_name)[1].lower()
        if not ext and f.content_type:
            mime_map = {
                "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
                "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"
            }
            ext = mime_map.get(f.content_type, ".jpg")

        safe_basename = re.sub(r'[^a-zA-Z0-9_\-.]', '_', os.path.splitext(original_name)[0])
        unique_name = f"{uuid.uuid4().hex[:10]}_{safe_basename}{ext}"
        file_path = os.path.join(upload_dir, unique_name)

        content = await f.read()
        file_size_bytes = len(content)
        with open(file_path, "wb") as disk_file:
            disk_file.write(content)

        file_size_str = format_file_size(file_size_bytes)
        doc_type = classify_media_type(original_name, f.content_type)
        content_type = f.content_type or ("video/mp4" if doc_type == "video" else "image/jpeg")
        public_url = f"/static/uploads/clients/{client_id}/{unique_name}"

        stmt = text("""
            INSERT INTO client_documents (client_id, name, file_url, url, file_type, file_size, doc_type, uploaded_by, created_at)
            VALUES (:cid, :name, :furl, :url, :ftype, :fsize, :dtype, :upby, NOW())
            RETURNING *
        """)
        res = await db.execute(stmt, {
            "cid": client_id,
            "name": original_name,
            "furl": public_url,
            "url": public_url,
            "ftype": content_type,
            "fsize": file_size_str,
            "dtype": doc_type,
            "upby": user_name
        })
        row = res.first()
        doc_dict = dict(row._mapping) if row else {}
        uploaded_docs.append(doc_dict)

        # Log activity to client timeline
        await db.execute(text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
            VALUES ('client', :cid, :cid, 'media', :title, :desc, :pby, NOW())
        """), {
            "cid": client_id,
            "title": f"{'Video' if doc_type == 'video' else 'Photo'} Uploaded: {original_name}",
            "desc": f"Uploaded {original_name} ({file_size_str})",
            "pby": user_name
        })

    await db.commit()
    return {"ok": True, "media": uploaded_docs, "documents": uploaded_docs}

@router.delete("/clients/{client_id}/documents/{document_id}")
@router.delete("/clients/{client_id}/media/{document_id}")
async def delete_client_document(
    client_id: int,
    document_id: int,
    user: Dict[str, Any] = Depends(require_permission("clients:view")),
    db: AsyncSession = Depends(get_db)
):
    # Check if file exists on disk to remove it
    res = await db.execute(text("SELECT file_url, url, name FROM client_documents WHERE id = :did AND client_id = :cid"), {
        "did": document_id,
        "cid": client_id
    })
    doc_row = res.first()
    if doc_row:
        file_url = doc_row.file_url or doc_row.url or ""
        if file_url.startswith("/static/"):
            rel_path = file_url[len("/static/"):]
            full_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", rel_path.replace("/", os.sep))
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except Exception:
                    pass

    await db.execute(text("DELETE FROM client_documents WHERE id = :did AND client_id = :cid"), {
        "did": document_id,
        "cid": client_id
    })
    await db.commit()
    return {"ok": True, "message": "Document deleted"}

