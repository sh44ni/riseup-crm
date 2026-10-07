from app.core.logger import get_logger
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.audit import record_audit_log
from app.core.permissions import build_scope_filter, check_resource_access, AuthUser
from app.middlewares.auth import require_auth, require_permission
from app.core.authz import Principal
from app.core.uow import UnitOfWork
from app.core.errors import NotFound, Forbidden
from app.domain.leads.service import LeadService
from app.domain.leads.schemas import LeadActivityCreatePayload
from app.services.sync import find_or_create_client, parse_address_components, normalize_phone
from app.utils.formatting import format_person_name
from app.services.scoring import calculate_lead_score
from app.schemas.leads import LeadCreate, LeadUpdate, LeadResponse
logger = get_logger(__name__)

router = APIRouter(prefix="/api/admin/leads", tags=["Leads"])

@router.get("", dependencies=[Depends(require_permission("leads:view"))])
async def list_leads(
    category: Optional[str] = None,
    tab: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_auth)
):
    conditions = []
    params = {"limit": limit, "offset": offset}

    # 1. Enforce Role & Data Scoping
    scope = build_scope_filter(
        user=user,
        permission="leads.view",
        creator_col="l.created_by_user_id",
        assigned_col="l.assigned_to_user_id",
        param_prefix="lead_scope_"
    )
    if not scope["allowed"]:
        return {
            "leads": [],
            "total": 0,
            "counts": {"all": 0, "leads": 0, "new_clients": 0, "existing_clients": 0, "lost_leads": 0}
        }
    if scope["clause"] != "1=1":
        conditions.append(scope["clause"])
        params.update(scope["params"])

    # Tab / Category arrangement
    raw_cat = category or tab
    if raw_cat:
        cat = raw_cat.strip().lower()
        if cat in ["lead", "leads"]:
            conditions.append("""(
                l.status NOT IN ('won', 'lost') AND 
                (c.client_category IS NULL OR c.client_category = 'lead' OR c.client_category = '') AND 
                (l.pipeline_stage IS NULL OR l.pipeline_stage NOT IN ('stage_4_closing', 'stage_5_completion_followup')) AND 
                l.lost_reason IS NULL
            )""")
        elif cat in ["new_client", "new_clients", "new"]:
            conditions.append("""(
                (l.status = 'won' OR c.client_category = 'new_client' OR l.pipeline_stage IN ('stage_4_closing', 'stage_5_completion_followup')) AND 
                (c.client_category != 'existing_client' OR c.client_category IS NULL)
            )""")
        elif cat in ["existing_client", "existing_clients", "existing"]:
            conditions.append("""(
                c.client_category = 'existing_client' OR c.status IN ('completed', 'repeat') OR COALESCE(c.total_jobs_count, 0) > 1
            )""")
        elif cat in ["lost_lead", "lost_leads", "lost"]:
            conditions.append("""(
                l.status = 'lost' OR c.client_category = 'lost_lead' OR l.lost_reason IS NOT NULL
            )""")

    if status and status != "all":
        conditions.append("l.status = :status")
        params["status"] = status
    if priority and priority != "all":
        conditions.append("l.priority = :priority")
        params["priority"] = priority

    if search and search.strip():
        conditions.append("""(
            LOWER(l.full_name) LIKE :q OR
            l.phone LIKE :q OR
            LOWER(COALESCE(l.email, '')) LIKE :q OR
            LOWER(COALESCE(l.address, '')) LIKE :q OR
            LOWER(COALESCE(l.city, '')) LIKE :q
        )""")
        params["q"] = f"%{search.strip().lower()}%"

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    sql = text(f"""
        SELECT 
            l.*, 
            u.name as assigned_to_name,
            u_creator.name as created_by_name,
            c.client_category,
            c.status as client_status,
            c.total_jobs_count,
            c.total_revenue as client_total_revenue,
            c.address as client_360_address,
            c.city as client_360_city,
            c.zip as client_360_zip,
            CASE 
                WHEN l.status = 'lost' OR c.client_category = 'lost_lead' OR l.lost_reason IS NOT NULL THEN 'lost_lead'
                WHEN c.client_category = 'existing_client' OR c.status IN ('completed', 'repeat') OR COALESCE(c.total_jobs_count, 0) > 1 THEN 'existing_client'
                WHEN l.status = 'won' OR c.client_category = 'new_client' OR l.pipeline_stage IN ('stage_4_closing', 'stage_5_completion_followup') THEN 'new_client'
                ELSE 'lead'
            END as profile_category,
            j.contract_value as job_contract_value,
            e.id as estimate_id, e.estimate_number, e.total as estimate_total, e.template_key as estimate_template_key, e.status as estimate_status,
            cnt.id as contract_id, cnt.contract_number, cnt.status as contract_status, cnt.contract_data
        FROM leads l
        LEFT JOIN users u ON l.assigned_to_user_id = u.id
        LEFT JOIN users u_creator ON l.created_by_user_id = u_creator.id
        LEFT JOIN clients c ON l.client_id = c.id
        LEFT JOIN LATERAL (
            SELECT id, job_number, status, contract_value
            FROM jobs 
            WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
            ORDER BY id DESC LIMIT 1
        ) j ON true
        LEFT JOIN LATERAL (
            SELECT id, estimate_number, total, status, template_key
            FROM estimates 
            WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
            ORDER BY id DESC LIMIT 1
        ) e ON true
        LEFT JOIN LATERAL (
            SELECT id, contract_number, status, contract_data
            FROM contracts
            WHERE (lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id))
              AND is_archived = false
            ORDER BY 
                CASE 
                    WHEN status = 'signed' THEN 1
                    WHEN status = 'client_signed' THEN 2
                    WHEN status = 'sent' THEN 3
                    ELSE 4
                END,
                id DESC 
            LIMIT 1
        ) cnt ON true
        {where}
        ORDER BY l.created_at DESC
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(sql, params)).mappings().all()

    processed_leads = []
    for r in rows:
        lead_d = dict(r)
        contract_val = float(lead_d.get("job_contract_value") or 0.0)
        if contract_val <= 0 and lead_d.get("contract_data"):
            cd = lead_d.get("contract_data")
            if isinstance(cd, str):
                try:
                    cd = json.loads(cd)
                except Exception:
                    cd = {}
            if isinstance(cd, dict):
                raw_cprice = cd.get("contractPrice") or cd.get("contract_price") or cd.get("total")
                if raw_cprice:
                    try:
                        clean_c = float(str(raw_cprice).replace("$", "").replace(",", "").strip())
                        if clean_c > 0:
                            contract_val = clean_c
                    except Exception:
                        pass
        lead_d["contract_value"] = contract_val if contract_val > 0 else None

        tmpl_key = lead_d.get("estimate_template_key")
        is_up = bool(tmpl_key == "uploaded")
        raw_et = float(lead_d.get("estimate_total") or 0.0)
        lead_d["estimate_total"] = None if (is_up or raw_et <= 0) else raw_et
        lead_d["is_uploaded_estimate"] = is_up
        processed_leads.append(lead_d)

    count_sql = text(f"""
        SELECT COUNT(*) 
        FROM leads l 
        LEFT JOIN clients c ON l.client_id = c.id
        {where}
    """)
    total = (await db.execute(count_sql, params)).scalar_one()

    # 5 Tab Counts: All Profiles, Leads, New Clients, Existing Clients, Lost Leads
    scope_where = f"WHERE {scope['clause']}" if scope.get("clause") and scope["clause"] != "1=1" else ""
    counts_sql = text(f"""
        SELECT 
            COUNT(*) as total_all,
            COUNT(CASE WHEN 
                (l.status NOT IN ('won', 'lost') AND (c.client_category IS NULL OR c.client_category = 'lead' OR c.client_category = '') AND (l.pipeline_stage IS NULL OR l.pipeline_stage NOT IN ('stage_4_closing', 'stage_5_completion_followup')) AND l.lost_reason IS NULL)
            THEN 1 END) as count_leads,
            COUNT(CASE WHEN 
                ((l.status = 'won' OR c.client_category = 'new_client' OR l.pipeline_stage IN ('stage_4_closing', 'stage_5_completion_followup')) AND (c.client_category != 'existing_client' OR c.client_category IS NULL))
            THEN 1 END) as count_new_clients,
            COUNT(CASE WHEN 
                (c.client_category = 'existing_client' OR c.status IN ('completed', 'repeat') OR COALESCE(c.total_jobs_count, 0) > 1)
            THEN 1 END) as count_existing_clients,
            COUNT(CASE WHEN 
                (l.status = 'lost' OR c.client_category = 'lost_lead' OR l.lost_reason IS NOT NULL)
            THEN 1 END) as count_lost_leads
        FROM leads l
        LEFT JOIN clients c ON l.client_id = c.id
        {scope_where}
    """)
    counts_row = (await db.execute(counts_sql, scope.get("params") or {})).mappings().first()

    counts = {
        "all": int(counts_row["total_all"] or 0) if counts_row else 0,
        "leads": int(counts_row["count_leads"] or 0) if counts_row else 0,
        "new_clients": int(counts_row["count_new_clients"] or 0) if counts_row else 0,
        "existing_clients": int(counts_row["count_existing_clients"] or 0) if counts_row else 0,
        "lost_leads": int(counts_row["count_lost_leads"] or 0) if counts_row else 0,
    }

    return {
        "leads": processed_leads, 
        "total": total,
        "counts": counts
    }

@router.post("", dependencies=[Depends(require_permission("leads:create"))])
async def create_lead(payload: LeadCreate, request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = payload.model_dump(exclude_unset=True)
    full_name = format_person_name(payload.full_name)
    phone = payload.phone
    email = payload.email
    parsed_addr = parse_address_components(payload.address, payload.city, payload.zip)
    address = parsed_addr["address"]
    city = parsed_addr["city"] or "San Diego"
    zip_code = parsed_addr["zip"]
    service_type = payload.service_type or "Residential Roofing"
    notes = payload.notes
    creator_name = getattr(user, "name", None) or (user.email.split("@")[0] if getattr(user, "email", None) else "Owner")
    lead_source = "manual"
    source_type = "manual"
    lead_source_detail = creator_name

    if not full_name:
        raise HTTPException(status_code=400, detail="Name is required")

    score, priority, _ = calculate_lead_score({
        "serviceType": service_type,
        "phone": phone,
        "email": email,
        "address": address,
        "zip": zip_code,
        "leadSource": lead_source,
    })

    client_id = await find_or_create_client(db, {
        "fullName": full_name,
        "phone": phone,
        "email": email,
        "address": address,
        "city": city,
        "zip": zip_code,
        "leadSource": "manual",
        "sourceType": "manual",
        "leadSourceDetail": creator_name,
        "acquiredByUserId": user.id,
        "notes": notes,
    })

    roof_sqf = body.get("roof_sqf") or body.get("roofSqf") or body.get("sqf")
    roof_squares = body.get("roof_squares") or body.get("roofSquares")
    user_provided_sqf = bool(roof_sqf or roof_squares)  # track whether user actually entered sq ft

    if roof_sqf:
        roof_sqf = int(roof_sqf)
        if not roof_squares:
            roof_squares = round(roof_sqf / 100.0, 1)
    elif roof_squares:
        roof_squares = float(roof_squares)
        roof_sqf = round(roof_squares * 100)
    else:
        # User did NOT provide sq ft — store NULL so the frontend shows "Unavailable"
        roof_sqf = None
        roof_squares = None

    roof_pitch = body.get("roof_pitch") or body.get("pitch") or "4:12"
    raw_stories = body.get("stories")
    stories = 1
    if raw_stories:
        try:
            stories = int(str(raw_stories).split()[0])
        except Exception:
            stories = 1
    roof_type = body.get("roof_type") or body.get("roofType") or "Spanish Tile"

    # Compute or accept estimated_value — only derive from sq ft when the user actually provided it
    estimated_value = body.get("estimated_value") or body.get("estimatedValue")
    if estimated_value is not None and float(estimated_value) > 0:
        estimated_value = float(estimated_value)
    elif user_provided_sqf and roof_sqf:
        from app.services.calculator import calculate_lead_estimated_value
        calc = calculate_lead_estimated_value(roof_sqf, service_type, roof_pitch, stories)
        estimated_value = float(calc["estimated_value"])
    else:
        # No sq ft provided — store NULL so the frontend shows "Unavailable"
        estimated_value = None


    insert_sql = text("""
        INSERT INTO leads (
            form_type, full_name, phone, email, address, city, zip, service_type,
            notes, status, priority, lead_score, lead_source, source_type,
            lead_source_detail, client_id, created_by_user_id, assigned_to_user_id,
            assigned_to, pipeline_stage, stage_entered_at,
            roof_sqf, roof_squares, roof_pitch, stories, roof_type, estimated_value,
            created_at, updated_at
        ) VALUES (
            'manual', :name, :phone, :email, :address, :city, :zip, :service,
            :notes, 'new', :priority, :score, 'manual', 'manual',
            :source_detail, :cid, :uid, :uid,
            :assigned_to, 'stage_1_lead_gen', NOW(),
            :roof_sqf, :roof_squares, :roof_pitch, :stories, :roof_type, :estimated_value,
            NOW(), NOW()
        ) RETURNING id, full_name, phone, email, status, pipeline_stage, client_id, lead_source, lead_source_detail, created_by_user_id, assigned_to_user_id, roof_sqf, roof_squares, estimated_value
    """)
    new_lead = (await db.execute(insert_sql, {
        "name": full_name, "phone": phone, "email": email, "address": address,
        "city": city, "zip": zip_code, "service": service_type, "notes": notes,
        "priority": priority, "score": score, "source_detail": lead_source_detail,
        "assigned_to": creator_name, "cid": client_id, "uid": user.id,
        "roof_sqf": roof_sqf, "roof_squares": roof_squares, "roof_pitch": roof_pitch,
        "stories": stories, "roof_type": roof_type, "estimated_value": estimated_value
    })).mappings().first()

    try:
        creator_name = getattr(user, "name", None) or (user.email.split("@")[0] if getattr(user, "email", None) else "Staff")
        author_role = getattr(user, "role", "Staff")
        if author_role:
            author_role = str(author_role).replace("_", " ").title()
        perf_by = f"{creator_name} ({author_role})" if author_role else str(creator_name)
        meta_dict = {
            "lead_name": full_name,
            "service_type": service_type,
            "estimated_value": float(estimated_value or 0),
        }
        await db.execute(text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, metadata, created_at)
            VALUES ('lead', :lid, :cid, 'lead_created', 'Lead Added', :desc, :pby, :uid, :uname, CAST(:meta AS jsonb), NOW())
        """), {
            "lid": int(new_lead["id"]),
            "cid": int(client_id) if client_id else None,
            "desc": f"{creator_name} added lead {full_name}",
            "pby": perf_by,
            "uid": user.id if getattr(user, "id", None) else None,
            "uname": creator_name,
            "meta": json.dumps(meta_dict)
        })
    except Exception as ex:
        logger.error(f"Failed to record lead_created activity: {ex}")

    await record_audit_log(db, "lead.create", "lead", new_lead["id"], user.id, user.email, user.role, body, request)
    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass
    return {"ok": True, "lead": dict(new_lead)}

@router.get("/{lead_id}", dependencies=[Depends(require_permission("leads:view"))])
async def get_lead_detail(lead_id: int, db: AsyncSession = Depends(get_db), user: AuthUser = Depends(require_auth)):
    sql = text("""
        SELECT 
            l.*, 
            u.name as assigned_to_name, 
            u.avatar_url as assigned_to_avatar,
            c.client_category,
            c.status as client_status,
            c.total_jobs_count,
            c.notes as client_notes,
            CASE 
                WHEN l.status = 'lost' OR c.client_category = 'lost_lead' OR l.lost_reason IS NOT NULL THEN 'lost_lead'
                WHEN c.client_category = 'existing_client' OR c.status IN ('completed', 'repeat') OR COALESCE(c.total_jobs_count, 0) > 1 THEN 'existing_client'
                WHEN l.status = 'won' OR c.client_category = 'new_client' OR l.pipeline_stage IN ('stage_4_closing', 'stage_5_completion_followup') THEN 'new_client'
                ELSE 'lead'
            END as profile_category,
            j.contract_value as job_contract_value,
            e.id as estimate_id, e.estimate_number, e.total as estimate_total, e.template_key as estimate_template_key, e.status as estimate_status,
            cnt.id as contract_id, cnt.contract_number, cnt.status as contract_status, cnt.contract_data
        FROM leads l
        LEFT JOIN users u ON l.assigned_to_user_id = u.id
        LEFT JOIN clients c ON l.client_id = c.id
        LEFT JOIN LATERAL (
            SELECT id, job_number, status, contract_value
            FROM jobs 
            WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
            ORDER BY id DESC LIMIT 1
        ) j ON true
        LEFT JOIN LATERAL (
            SELECT id, estimate_number, total, status, template_key
            FROM estimates 
            WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
            ORDER BY id DESC LIMIT 1
        ) e ON true
        LEFT JOIN LATERAL (
            SELECT id, contract_number, status, contract_data
            FROM contracts
            WHERE (lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id))
              AND is_archived = false
            ORDER BY 
                CASE 
                    WHEN status = 'signed' THEN 1
                    WHEN status = 'client_signed' THEN 2
                    WHEN status = 'sent' THEN 3
                    ELSE 4
                END,
                id DESC 
            LIMIT 1
        ) cnt ON true
        WHERE l.id = :id
    """)
    row = (await db.execute(sql, {"id": lead_id})).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not check_resource_access(user, "leads.view", creator_id=row.get("created_by_user_id"), assigned_id=row.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view this lead.")

    res_dict = dict(row)
    # Prefer client record notes as source of truth if available, otherwise lead notes
    resolved_notes = row.get("client_notes") or row.get("notes") or ""
    res_dict["notes"] = resolved_notes
    res_dict["client_notes"] = row.get("client_notes") or ""

    # Resolve contract_value from jobs or contracts.contract_data
    contract_val = float(res_dict.get("job_contract_value") or 0.0)
    if contract_val <= 0 and res_dict.get("contract_data"):
        cd = res_dict.get("contract_data")
        if isinstance(cd, str):
            try:
                cd = json.loads(cd)
            except Exception:
                cd = {}
        if isinstance(cd, dict):
            raw_cprice = cd.get("contractPrice") or cd.get("contract_price") or cd.get("total")
            if raw_cprice:
                try:
                    clean_c = float(str(raw_cprice).replace("$", "").replace(",", "").strip())
                    if clean_c > 0:
                        contract_val = clean_c
                except Exception:
                    pass
    res_dict["contract_value"] = contract_val if contract_val > 0 else None

    # Resolve estimate_total and upload status
    tmpl_key = res_dict.get("estimate_template_key")
    is_up = bool(tmpl_key == "uploaded")
    raw_et = float(res_dict.get("estimate_total") or 0.0)
    res_dict["estimate_total"] = None if (is_up or raw_et <= 0) else raw_et
    res_dict["is_uploaded_estimate"] = is_up
    return {"lead": res_dict}

@router.put("/{lead_id}", dependencies=[Depends(require_permission("leads:edit"))])
async def update_lead(lead_id: int, payload: LeadUpdate, request: Request, db: AsyncSession = Depends(get_db), user: AuthUser = Depends(require_auth)):
    target = (await db.execute(text("""
        SELECT l.*,
               u.name AS prev_user_name, u.email AS prev_user_email
        FROM leads l
        LEFT JOIN users u ON l.assigned_to_user_id = u.id
        WHERE l.id = :id
    """), {"id": lead_id})).mappings().first()
    if not target:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not check_resource_access(user, "leads.edit", creator_id=target.get("created_by_user_id"), assigned_id=target.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to edit this lead.")

    body = payload.model_dump(exclude_unset=True)

    # ── Unclaimed Lead Stage Guard ──
    # If a lead is not claimed and not being claimed in this update, its stage cannot be advanced
    is_unclaimed = target.get("assigned_to_user_id") is None
    new_assignee = body.get("assigned_to_user_id")
    if is_unclaimed and not new_assignee:
        if "pipeline_stage" in body and body["pipeline_stage"] not in ("cold_lead", "stage_1_lead_gen", "new_leads"):
            raise HTTPException(
                status_code=400,
                detail="Please claim the lead first before advancing its stage."
            )
        if "status" in body and body["status"] not in ("new",):
            raise HTTPException(
                status_code=400,
                detail="Please claim the lead first before advancing its stage."
            )

    # ── Assignment & Reassignment Permission Guard ──
    if "assigned_to_user_id" in body:
        current_assignee = target.get("assigned_to_user_id")
        desired_assignee = body.get("assigned_to_user_id")
        if desired_assignee != current_assignee:
            if current_assignee is None and desired_assignee == getattr(user, "id", None):
                if not check_resource_access(user, "leads.claim", creator_id=target.get("created_by_user_id")):
                    raise HTTPException(status_code=403, detail="Permission denied to claim this lead.")
            else:
                if not check_resource_access(user, "leads.reassign", creator_id=target.get("created_by_user_id"), assigned_id=current_assignee):
                    raise HTTPException(status_code=403, detail="Permission denied to reassign this lead.")

    updates = []
    params = {"id": lead_id}

    allowed_fields = [
        "full_name", "phone", "email", "address", "city", "zip", "service_type",
        "notes", "status", "priority", "pipeline_stage", "assigned_to_user_id", "lost_reason",
        "lost_notes", "lost_at",
        "roof_sqf", "roof_squares", "roof_pitch", "stories", "roof_type", "estimated_value",
        "site_visit_scheduled_at", "site_visit_completed_at",
    ]

    # Parse address components if any address field is updated
    if any(k in body for k in ["address", "city", "zip"]):
        parsed_addr = parse_address_components(
            body.get("address", target.get("address")),
            body.get("city", target.get("city")),
            body.get("zip", target.get("zip"))
        )
        if "address" in body:
            body["address"] = parsed_addr["address"]
        if "city" in body:
            body["city"] = parsed_addr["city"]
        if "zip" in body:
            body["zip"] = parsed_addr["zip"]

    # Normalize full_name
    if "full_name" in body and body["full_name"]:
        body["full_name"] = format_person_name(body["full_name"])

    # Normalize email
    if "email" in body:
        raw_e = (body.get("email") or "").strip().lower()
        body["email"] = raw_e if raw_e else None

    # Normalize phone
    if "phone" in body:
        raw_p = (body.get("phone") or "").strip()
        body["phone"] = raw_p if raw_p else None

    for k in allowed_fields:
        if k in body:
            updates.append(f"{k} = :{k}")
            params[k] = body[k]

    # Client 360 contact sync & deduplication (Client 360 as source of truth)
    cid = target.get("client_id")
    has_contact_update = any(k in body for k in ["full_name", "phone", "email", "address", "city", "zip"])
    has_address_update = any(k in body for k in ["address", "city", "zip"])

    # If lead does not have a linked client, find or create one so Client 360 is the source of truth
    if not cid and (has_contact_update or "notes" in body):
        client_data = {
            "fullName": body.get("full_name") or target.get("full_name") or "Lead Homeowner",
            "phone": body.get("phone") or target.get("phone"),
            "email": body.get("email") or target.get("email"),
            "address": body.get("address") or target.get("address"),
            "city": body.get("city") or target.get("city") or None,
            "zip": body.get("zip") or target.get("zip"),
            "notes": body.get("notes") or target.get("notes"),
            "leadSource": "manual",
            "sourceType": "manual",
        }
        cid = await find_or_create_client(db, client_data)
        if cid:
            updates.append("client_id = :new_cid")
            params["new_cid"] = cid

    # Auto-calculate estimated_value if roof_sqf or service_type provided and estimated_value is not
    if ("roof_sqf" in body or "service_type" in body) and "estimated_value" not in body:
        new_sqft = body.get("roof_sqf") if "roof_sqf" in body else target.get("roof_sqf")
        if new_sqft is not None and float(new_sqft) > 0:
            from app.services.calculator import calculate_lead_estimated_value
            sqft_val = float(new_sqft)
            svc_val = body.get("service_type") or target.get("service_type") or "Residential Roofing"
            pitch_val = body.get("roof_pitch") or target.get("roof_pitch") or "4:12"
            stories_val = int(body.get("stories") or target.get("stories") or 1)
            calc = calculate_lead_estimated_value(sqft_val, svc_val, pitch_val, stories_val)
            calc_val = float(calc["estimated_value"])
            updates.append("estimated_value = :calc_est_val")
            params["calc_est_val"] = calc_val
        elif "roof_sqf" in body and (new_sqft is None or float(new_sqft) <= 0):
            updates.append("estimated_value = NULL")

    # Automatically keep roof_squares in sync when roof_sqf is updated
    if "roof_sqf" in body and "roof_squares" not in body:
        new_sqft = body.get("roof_sqf")
        if new_sqft is not None and float(new_sqft) > 0:
            calc_sq = round(float(new_sqft) / 100.0, 1)
            updates.append("roof_squares = :auto_roof_squares")
            params["auto_roof_squares"] = calc_sq
        elif new_sqft is None:
            updates.append("roof_squares = NULL")

    if body.get("status") == "completed" or body.get("pipeline_stage") in ("completed", "job_completed"):
        updates.append("job_completed_at = COALESCE(job_completed_at, NOW())")

    # Auto-stamp lost_at when marking as lost (if not explicitly provided)
    if body.get("status") == "lost" and "lost_at" not in body:
        updates.append("lost_at = COALESCE(lost_at, NOW())")

    if updates:
        sql = f"""UPDATE leads SET {', '.join(updates)}, updated_at = NOW()
            WHERE id = :id
            RETURNING id, full_name, phone, email, address, city, zip,
                      status, pipeline_stage, client_id, roof_sqf, roof_squares,
                      estimated_value, notes, updated_at"""
        updated = (await db.execute(text(sql), params)).mappings().first()

        
        # Synchronize Client 360 record (source of truth)
        cid = updated.get("client_id") if updated else cid
        if cid:
            # Sync contact info & address to clients table without overwriting valid data with blanks
            client_updates = []
            c_params = {"cid": cid}
            for cf in ["full_name", "email", "phone", "address", "city", "zip", "notes"]:
                if cf in body:
                    val = body[cf]
                    if isinstance(val, str):
                        val = val.strip() or None
                    if val is not None or cf == "notes":
                        client_updates.append(f"{cf} = :{cf}")
                        c_params[cf] = val
                        if cf == "phone":
                            norm = normalize_phone(val)
                            client_updates.append("phone_normalized = :norm_phone")
                            c_params["norm_phone"] = norm
            if client_updates:
                client_updates.append("updated_at = NOW()")
                await db.execute(text(f"UPDATE clients SET {', '.join(client_updates)} WHERE id = :cid"), c_params)

            # Synchronize client category and status
            new_cat = None
            if body.get("status") == "lost" or body.get("lost_reason"):
                new_cat = "lost_lead"
                lost_r = body.get("lost_reason") or "Lost Opportunity"
                await db.execute(text("""
                    UPDATE clients
                    SET client_category = 'lost_lead',
                        status = 'closed_lost',
                        lost_reason = COALESCE(:reason, lost_reason),
                        updated_at = NOW()
                    WHERE id = :cid
                """), {"reason": lost_r, "cid": cid})
            elif body.get("status") == "won" or body.get("pipeline_stage") == "stage_4_closing":
                new_cat = "new_client"
                await db.execute(text("UPDATE clients SET client_category = :cat, status = 'active_job', updated_at = NOW() WHERE id = :cid"), {"cat": new_cat, "cid": cid})
            elif body.get("status") in ["new", "contacted", "site_visit_scheduled", "estimate_sent"]:
                new_cat = "lead"
                await db.execute(text("UPDATE clients SET client_category = :cat, updated_at = NOW() WHERE id = :cid"), {"cat": new_cat, "cid": cid})
            if "category" in body:
                cat_val = body["category"]
                if cat_val in ["lead", "new_client", "existing_client", "lost_lead"]:
                    new_cat = cat_val
                    await db.execute(text("UPDATE clients SET client_category = :cat, updated_at = NOW() WHERE id = :cid"), {"cat": new_cat, "cid": cid})

        # Activity log for address updates
        if has_address_update:
            try:
                creator_name = getattr(user, "name", None) or (user.email.split("@")[0] if getattr(user, "email", None) else "Staff")
                addr_parts = [body.get(k) for k in ["address", "city", "zip"] if body.get(k)]
                addr_str = ", ".join(addr_parts) if addr_parts else "Cleared"
                await db.execute(text("""
                    INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, created_at)
                    VALUES ('lead', :lid, :cid, 'address_updated', 'Address Updated', :desc, :pby, :uid, :uname, NOW())
                """), {
                    "lid": lead_id,
                    "cid": cid,
                    "desc": f"Address updated to: {addr_str}",
                    "pby": creator_name,
                    "uid": getattr(user, "id", None),
                    "uname": creator_name,
                })
            except Exception as ex:
                logger.error(f"Failed to record address_updated activity: {ex}")

        # Activity log for lead claim / reassignment
        if "assigned_to_user_id" in body and body.get("assigned_to_user_id") != target.get("assigned_to_user_id"):
            try:
                creator_name = getattr(user, "name", None) or (user.email.split("@")[0] if getattr(user, "email", None) else "Staff")
                author_role = getattr(user, "role", "Staff")
                if author_role:
                    author_role = str(author_role).replace("_", " ").title()
                perf_by = f"{creator_name} ({author_role})" if author_role else str(creator_name)
                lead_name = updated.get("full_name") or f"Lead #{lead_id}"
                
                new_uid = body.get("assigned_to_user_id")
                target_u = (await db.execute(text("SELECT id, name, email FROM users WHERE id = :uid"), {"uid": new_uid})).mappings().first() if new_uid else None
                new_name = (target_u.get("name") or target_u.get("email")) if target_u else "Unassigned"
                prev_name = target.get("prev_user_name") or (f"User #{target.get('assigned_to_user_id')}" if target.get("assigned_to_user_id") else "Unassigned")
                now_iso = datetime.now(timezone.utc).isoformat()

                meta_dict = {
                    "lead_id": lead_id,
                    "lead_name": lead_name,
                    "previous_assignee_id": target.get("assigned_to_user_id"),
                    "previous_assignee_name": prev_name,
                    "new_assignee_id": new_uid,
                    "new_assignee_name": new_name,
                    "acting_user_id": user.id,
                    "acting_user_name": creator_name,
                    "timestamp": now_iso
                }
                is_claim = target.get("assigned_to_user_id") is None and new_uid == getattr(user, "id", None)
                act_type = "lead_claimed" if is_claim else "lead_reassigned"
                act_title = "Lead Claimed" if is_claim else "Lead Reassigned"
                act_desc = f"{creator_name} claimed lead {lead_name}" if is_claim else f"{creator_name} reassigned {lead_name} from {prev_name} to {new_name}"

                await db.execute(text("""
                    INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name, metadata, created_at)
                    VALUES ('lead', :lid, :cid, :act_type, :title, :desc, :pby, :uid, :uname, CAST(:meta AS jsonb), NOW())
                """), {
                    "lid": lead_id,
                    "cid": cid,
                    "act_type": act_type,
                    "title": act_title,
                    "desc": act_desc,
                    "pby": perf_by,
                    "uid": getattr(user, "id", None),
                    "uname": creator_name,
                    "meta": json.dumps(meta_dict)
                })
            except Exception as ex:
                logger.error(f"Failed to record assignment activity in update_lead: {ex}")

        await record_audit_log(db, "lead.update", "lead", lead_id, user.id, user.email, user.role, body, request)
        try:
            from app.core.redis import cache_delete
            await cache_delete("crm:dashboard:stats")
        except Exception:
            pass
        return {"ok": True, "lead": dict(updated)}

    return {"ok": True}

@router.delete("/{lead_id}", dependencies=[Depends(require_permission("leads:delete"))])
async def delete_lead(lead_id: int, request: Request, db: AsyncSession = Depends(get_db), user: AuthUser = Depends(require_auth)):
    lead = (await db.execute(text("SELECT full_name, created_by_user_id, assigned_to_user_id FROM leads WHERE id = :id"), {"id": lead_id})).mappings().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not check_resource_access(user, "leads.delete", creator_id=lead.get("created_by_user_id"), assigned_id=lead.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to delete this lead.")

    await db.execute(text("DELETE FROM leads WHERE id = :id"), {"id": lead_id})
    await record_audit_log(db, "lead.delete", "lead", lead_id, user.id, user.email, user.role, {"deletedLead": lead["full_name"]}, request)
    try:
        from app.core.redis import cache_delete
        await cache_delete("crm:dashboard:stats")
    except Exception:
        pass
    return {"ok": True}

@router.get("/{lead_id}/activities", dependencies=[Depends(require_permission("leads:view"))])
async def get_lead_activities(lead_id: int, db: AsyncSession = Depends(get_db), user: AuthUser = Depends(require_auth)):
    lead = (await db.execute(text("SELECT id, created_by_user_id, assigned_to_user_id FROM leads WHERE id = :id"), {"id": lead_id})).mappings().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not check_resource_access(user, "leads.view", creator_id=lead.get("created_by_user_id"), assigned_id=lead.get("assigned_to_user_id")):
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view activities for this lead.")

    sql = text("SELECT * FROM activities WHERE entity_type = 'lead' AND entity_id = :lid ORDER BY created_at DESC")
    rows = (await db.execute(sql, {"lid": lead_id})).mappings().all()
    return {"activities": [dict(r) for r in rows]}

@router.post("/{lead_id}/activities", dependencies=[Depends(require_permission("leads:edit"))])
async def create_lead_activity(
    lead_id: int,
    payload: LeadActivityCreatePayload,
    db: AsyncSession = Depends(get_db),
    user: AuthUser = Depends(require_auth),
):
    principal = Principal(
        id=user.id,
        role=user.role,
        kind="api_key" if user.is_api_key else "user",
        name=user.name,
        email=user.email,
        permissions=user.permissions,
        is_protected_owner=user.is_protected_owner,
        api_key_id=user.api_key_id,
    )
    uow = UnitOfWork(db)
    service = LeadService(uow)
    new_act = await service.add_activity(principal, lead_id, payload)
    return {"ok": True, "activity": new_act}

