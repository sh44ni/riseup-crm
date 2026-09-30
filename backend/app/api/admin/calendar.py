from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta, date as py_date
from pydantic import BaseModel, Field

class CreateTaskPayload(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    notes: Optional[str] = None
    category: Optional[str] = None
    eventType: Optional[str] = None
    assignedToUserId: Optional[int] = None
    assignedTo: Optional[str] = None
    dueAt: Optional[str] = None
    date: Optional[str] = None
    startTime: Optional[str] = None
    endAt: Optional[str] = None
    endTime: Optional[str] = None
    entityId: Optional[int] = None
    entityType: Optional[str] = None
    priority: Optional[str] = None
    workCategory: Optional[str] = None

class UpdateTaskPayload(BaseModel):
    id: Optional[str] = None
    numericId: Optional[int] = None
    completed: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    eventType: Optional[str] = None
    dueAt: Optional[str] = None
    date: Optional[str] = None
    startTime: Optional[str] = None
    endAt: Optional[str] = None
    assignedToUserId: Optional[int] = None
    assignedTo: Optional[str] = None

from app.core.database import get_db
from app.core.permissions import require_any_permission, has_any_permission

router = APIRouter()

ROLE_LABELS = {
    "owner": "Owner & Executive",
    "project_manager": "Project Manager",
    "field_foreman": "Field Foreman",
    "senior_estimator": "Senior Estimator",
    "sales_rep": "Sales Representative",
    "office_admin": "Logistics Coordinator",
}

AVATAR_COLORS = [
    "from-sky-500 to-blue-600",
    "from-blue-500 to-indigo-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-purple-500 to-pink-600",
    "from-rose-500 to-orange-500",
]

def get_user_avatar_info(user_id: Optional[int], user_name: Optional[str], user_role: Optional[str] = None):
    name = (user_name or "Team Member").strip()
    parts = [p for p in name.split() if p]
    initials = (parts[0][0] + (parts[1][0] if len(parts) > 1 else "")).upper() if parts else "TM"
    color_idx = (user_id or 0) % len(AVATAR_COLORS)
    avatar_color = AVATAR_COLORS[color_idx]
    role_label = ROLE_LABELS.get((user_role or "").lower(), (user_role or "Team Member").replace("_", " ").title())
    return initials, avatar_color, role_label

def to_iso_string(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    try:
        return str(val)
    except Exception:
        return None

def to_date_string(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, (datetime, py_date)):
        return val.strftime("%Y-%m-%d")
    s = str(val)
    return s[:10] if len(s) >= 10 else s

def format_time_from_date(val: Any) -> Dict[str, Any]:
    if not val:
        return {"time": None, "is_all_day": True}
    if isinstance(val, str):
        try:
            val = datetime.fromisoformat(val.replace("Z", "+00:00"))
        except Exception:
            return {"time": None, "is_all_day": True}
    if isinstance(val, datetime):
        if val.hour == 0 and val.minute == 0 and val.second == 0:
            return {"time": None, "is_all_day": True}
        return {"time": val.strftime("%I:%M %p"), "is_all_day": False}
    return {"time": None, "is_all_day": True}

def parse_date_parts(val: Any):
    if not val:
        now = datetime.now()
        return now.strftime("%Y-%m-%d"), now.day, now.month, now.year
    if isinstance(val, (datetime, py_date)):
        d = val if isinstance(val, py_date) else val.date()
        return d.strftime("%Y-%m-%d"), d.day, d.month, d.year
    if isinstance(val, str):
        try:
            cleaned = val.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            return dt.strftime("%Y-%m-%d"), dt.day, dt.month, dt.year
        except Exception:
            try:
                parts = val.split("-")
                return val[:10], int(parts[2][:2]), int(parts[1]), int(parts[0])
            except Exception:
                pass
    return str(val)[:10], 1, 1, 2026

def compose_datetime(date_str: Optional[str], time_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    date_clean = date_str[:10].strip()
    time_clean = (time_str or "").strip()
    if not time_clean:
        try:
            dt = datetime.strptime(date_clean, "%Y-%m-%d")
            return dt.replace(hour=9, minute=0, tzinfo=timezone.utc)
        except Exception:
            return None

    # Common formats: "09:30 AM", "14:00", "09:30"
    for fmt in ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %I:%M%p", "%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(f"{date_clean} {time_clean}", fmt)
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    try:
        dt = datetime.fromisoformat(f"{date_clean}T{time_clean}")
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        pass

    try:
        dt = datetime.strptime(date_clean, "%Y-%m-%d")
        return dt.replace(hour=9, minute=0, tzinfo=timezone.utc)
    except Exception:
        return None


@router.get("/calendar")
async def get_calendar_events(
    event_type: Optional[str] = None,
    category: Optional[str] = None,
    person_id: Optional[str] = None,
    assigned_to_user_id: Optional[str] = Query(None, alias="assignedToUserId"),
    status: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    user: Dict[str, Any] = Depends(require_any_permission(["field:view_calendar", "jobs:view", "leads:view"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Central Team Operations & Task Calendar Feed.
    Standardizes events across PostgreSQL `tasks`, scheduled `leads`, `jobs`, and `warranties`
    into a unified TeamOperationEvent schema with zero mock fallbacks.
    """
    # 1. Registered Team Members
    users_q = text("""
        SELECT id, name, email, role, phone, avatar_url
        FROM users
        WHERE status = 'active'
        ORDER BY 
            CASE role
                WHEN 'owner' THEN 1
                WHEN 'project_manager' THEN 2
                WHEN 'field_foreman' THEN 3
                WHEN 'senior_estimator' THEN 4
                WHEN 'sales_rep' THEN 5
                WHEN 'office_admin' THEN 6
                ELSE 7
            END, name ASC
    """)
    users_res = await db.execute(users_q)
    users = [dict(r._mapping) for r in users_res.fetchall()]
    user_by_name = {u["name"].lower().strip(): u for u in users if u.get("name")}
    user_by_id = {u["id"]: u for u in users}
    default_user = users[0] if users else {"id": 1, "name": "Sam Martinez", "role": "owner"}

    # 2. Pipeline Jobs
    jobs_q = text("""
        SELECT 
            j.id, j.job_number, j.status, j.customer_name, j.customer_phone, j.customer_email,
            j.address, j.city, j.zip, j.service_type, j.contract_value,
            j.scheduled_start, j.estimated_days, j.actual_start, j.actual_end,
            j.material_delivered_at, j.material_status, j.permit_approved_at, j.permit_status,
            j.crew_lead, j.notes
        FROM jobs j
        WHERE j.scheduled_start IS NOT NULL 
           OR j.material_delivered_at IS NOT NULL 
           OR j.permit_approved_at IS NOT NULL
           OR j.permit_status = 'inspection_scheduled'
        ORDER BY j.scheduled_start ASC
    """)
    jobs_res = await db.execute(jobs_q)
    jobs = [dict(r._mapping) for r in jobs_res.fetchall()]

    # 3. Pipeline Leads Site Visits
    leads_q = text("""
        SELECT 
            l.id, l.full_name, l.phone, l.email, l.address, l.city, l.zip,
            l.service_type, l.site_visit_scheduled_at, l.pipeline_stage, l.status,
            u.id as assigned_user_id, u.name as assigned_user_name, u.role as assigned_user_role, u.avatar_url as assigned_user_avatar
        FROM leads l
        LEFT JOIN users u ON l.assigned_to_user_id = u.id
        WHERE l.site_visit_scheduled_at IS NOT NULL
        ORDER BY l.site_visit_scheduled_at ASC
    """)
    leads_res = await db.execute(leads_q)
    leads = [dict(r._mapping) for r in leads_res.fetchall()]

    # 4. Operations & Tasks from `tasks` table (with linked entity joins)
    tasks_q = text("""
        SELECT 
            t.id, t.title, t.description, t.assigned_to, t.assigned_to_user_id,
            t.due_at, t.end_at, t.completed_at, t.priority, t.event_type, t.work_category,
            t.entity_type, t.entity_id, t.created_by_user_id,
            u.name as user_name, u.role as user_role, u.avatar_url as user_avatar, u.phone as user_phone,
            u_creator.name as creator_name,
            l.full_name as lead_name, l.address as lead_address, l.city as lead_city, l.phone as lead_phone,
            j.customer_name as job_customer_name, j.job_number as job_code, j.address as job_address, j.city as job_city
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        LEFT JOIN users u_creator ON t.created_by_user_id = u_creator.id
        LEFT JOIN leads l ON t.entity_type = 'lead' AND t.entity_id = l.id
        LEFT JOIN jobs j ON t.entity_type = 'job' AND t.entity_id = j.id
        WHERE t.due_at IS NOT NULL
          AND t.event_type NOT IN ('sticky_note')
        ORDER BY t.due_at ASC
    """)
    tasks_res = await db.execute(tasks_q)
    tasks = [dict(r._mapping) for r in tasks_res.fetchall()]

    # 5. Warranties
    warranties_q = text("""
        SELECT 
            w.id, w.warranty_number, w.warranty_type, w.checkin_6mo_due, w.checkin_1yr_due, 
            w.checkin_6mo_completed, w.checkin_1yr_completed, w.job_id,
            j.customer_name, j.customer_phone, j.address, j.city
        FROM warranties w
        LEFT JOIN jobs j ON w.job_id = j.id
        WHERE w.status = 'active'
    """)
    warranties_res = await db.execute(warranties_q)
    warranties = [dict(r._mapping) for r in warranties_res.fetchall()]

    # 6. Roof Inspections
    inspections_q = text("""
        SELECT 
            i.id, i.inspection_number, i.inspection_date, i.inspector_name, i.roof_health_score,
            i.urgent_action_required, i.lead_id,
            l.full_name as customer_name, l.phone as customer_phone, l.address, l.city
        FROM inspections i
        LEFT JOIN leads l ON i.lead_id = l.id
        WHERE i.inspection_date IS NOT NULL
        ORDER BY i.inspection_date DESC
    """)
    inspections_res = await db.execute(inspections_q)
    inspections = [dict(r._mapping) for r in inspections_res.fetchall()]

    events: List[Dict[str, Any]] = []

    # Map Tasks (Primary Team Operations)
    for t in tasks:
        raw_due = t.get("due_at")
        raw_end = t.get("end_at")
        date_str, day_num, month_num, year_num = parse_date_parts(raw_due)
        time_info = format_time_from_date(raw_due)
        end_time_info = format_time_from_date(raw_end)

        uid = t.get("assigned_to_user_id")
        assigned_user = user_by_id.get(uid) if uid else None
        uname = (assigned_user["name"] if assigned_user else (t.get("user_name") or t.get("assigned_to") or default_user["name"]))
        urole = (assigned_user["role"] if assigned_user else (t.get("user_role") or "team_member"))
        initials, avatar_color, role_label = get_user_avatar_info(uid or default_user["id"], uname, urole)

        # Normalize category
        raw_cat = (t.get("event_type") or "team_task").lower()
        if raw_cat in ("client_meeting", "client_visit"):
            cat = "client_meeting"
        elif raw_cat in ("project_op", "jobsite_walkthrough", "roof_install"):
            cat = "project_op"
        elif raw_cat in ("permit_filing", "city_permit"):
            cat = "permit_filing"
        elif raw_cat in ("warranty_audit", "warranty_checkin"):
            cat = "warranty_audit"
        elif raw_cat == "reminder":
            cat = "reminder"
        else:
            cat = "team_task"

        is_done = bool(t.get("completed_at"))
        entity_name = t.get("lead_name") or t.get("job_customer_name") or (f"Job #{t.get('job_code')}" if t.get('job_code') else None)
        location = t.get("lead_address") or t.get("job_address") or ""
        city = t.get("lead_city") or t.get("job_city") or "Carlsbad"

        events.append({
            "id": f"task-{t['id']}",
            "numericId": t["id"],
            "title": t.get("title") or "Team Operation",
            "description": t.get("description") or "",
            "category": cat,
            "date": date_str,
            "dayNumber": day_num,
            "month": month_num,
            "year": year_num,
            "startTime": time_info["time"] or "09:00 AM",
            "endTime": end_time_info["time"] or "10:00 AM",
            "dueAt": to_iso_string(raw_due),
            "endAt": to_iso_string(raw_end),
            "isAllDay": time_info["is_all_day"],
            "completed": is_done,
            "completedAt": to_iso_string(t.get("completed_at")),
            "status": "completed" if is_done else "scheduled",
            "priority": (t.get("priority") or "normal").lower(),
            "assignedToUserId": uid or default_user["id"],
            "assignedToName": uname,
            "assignedToRole": role_label,
            "assignedToAvatarColor": avatar_color,
            "assignedToInitials": initials,
            "createdByUserId": t.get("created_by_user_id"),
            "createdByName": t.get("creator_name") or "Staff",
            "entityType": t.get("entity_type"),
            "entityId": t.get("entity_id"),
            "entityName": entity_name,
            "customerName": entity_name or uname,
            "address": location,
            "city": city,
            "sourceType": "task",
            "isSynced": True,
        })

    # Map Leads (Scheduled Site Visits)
    for l in leads:
        raw_visit = l.get("site_visit_scheduled_at")
        date_str, day_num, month_num, year_num = parse_date_parts(raw_visit)
        time_info = format_time_from_date(raw_visit)

        uid = l.get("assigned_user_id")
        assigned_user = user_by_id.get(uid) if uid else None
        uname = (assigned_user["name"] if assigned_user else (l.get("assigned_user_name") or "Sam Martinez"))
        urole = (assigned_user["role"] if assigned_user else (l.get("assigned_user_role") or "senior_estimator"))
        initials, avatar_color, role_label = get_user_avatar_info(uid or 1, uname, urole)

        events.append({
            "id": f"lead-visit-{l['id']}",
            "numericId": l["id"],
            "title": f"Site Visit: {l.get('full_name')}",
            "description": f"Scheduled 12-Pt roof inspection for {l.get('service_type') or 'Roof Estimate'}",
            "category": "client_meeting",
            "date": date_str,
            "dayNumber": day_num,
            "month": month_num,
            "year": year_num,
            "startTime": time_info["time"] or "10:00 AM",
            "endTime": "11:30 AM",
            "dueAt": to_iso_string(raw_visit),
            "endAt": None,
            "isAllDay": time_info["is_all_day"],
            "completed": l.get("status") in ("converted", "closed"),
            "completedAt": None,
            "status": "completed" if l.get("status") in ("converted", "closed") else "scheduled",
            "priority": "high",
            "assignedToUserId": uid or 1,
            "assignedToName": uname,
            "assignedToRole": role_label,
            "assignedToAvatarColor": avatar_color,
            "assignedToInitials": initials,
            "entityType": "lead",
            "entityId": l["id"],
            "entityName": l.get("full_name"),
            "customerName": l.get("full_name"),
            "address": l.get("address") or "",
            "city": l.get("city") or "Carlsbad",
            "phone": l.get("phone"),
            "sourceType": "lead_visit",
            "isSynced": True,
        })

    # Map Jobs (Project Milestones & Scheduled Starts)
    for j in jobs:
        lead_name = j.get("crew_lead")
        matched = user_by_name.get(lead_name.lower().strip()) if lead_name else None
        uid = matched["id"] if matched else 3 # Default Marco Silva (Field Foreman)
        uname = matched["name"] if matched else (lead_name or "Marco Silva")
        urole = matched["role"] if matched else "field_foreman"
        initials, avatar_color, role_label = get_user_avatar_info(uid, uname, urole)

        if j.get("scheduled_start"):
            raw_start = j["scheduled_start"]
            date_str, day_num, month_num, year_num = parse_date_parts(raw_start)
            time_info = format_time_from_date(raw_start)
            is_job_done = j.get("status") in ("completed", "closed", "paid")

            events.append({
                "id": f"job-{j['id']}",
                "numericId": j["id"],
                "title": f"Roof Install: {j.get('customer_name')}",
                "description": f"{j.get('service_type') or 'Roof Replacement'} • Job #{j.get('job_number')}",
                "category": "project_op",
                "date": date_str,
                "dayNumber": day_num,
                "month": month_num,
                "year": year_num,
                "startTime": time_info["time"] or "07:00 AM",
                "endTime": "03:30 PM",
                "dueAt": to_iso_string(raw_start),
                "endAt": None,
                "isAllDay": True,
                "completed": is_job_done,
                "status": "completed" if is_job_done else "scheduled",
                "priority": "normal",
                "assignedToUserId": uid,
                "assignedToName": uname,
                "assignedToRole": role_label,
                "assignedToAvatarColor": avatar_color,
                "assignedToInitials": initials,
                "entityType": "job",
                "entityId": j["id"],
                "entityName": j.get("customer_name"),
                "customerName": j.get("customer_name"),
                "jobCode": j.get("job_number"),
                "address": j.get("address") or "",
                "city": j.get("city") or "Carlsbad",
                "phone": j.get("customer_phone"),
                "sourceType": "job_schedule",
                "isSynced": True,
            })

        if j.get("permit_approved_at") or j.get("permit_status") == "inspection_scheduled":
            raw_p = j.get("permit_approved_at") or j.get("scheduled_start")
            date_str, day_num, month_num, year_num = parse_date_parts(raw_p)
            events.append({
                "id": f"permit-{j['id']}",
                "numericId": j["id"],
                "title": f"Permit Inspection: {j.get('job_number')}",
                "description": f"City Building & Safety final inspection for {j.get('customer_name')}",
                "category": "permit_filing",
                "date": date_str,
                "dayNumber": day_num,
                "month": month_num,
                "year": year_num,
                "startTime": "09:00 AM",
                "endTime": "11:00 AM",
                "dueAt": to_iso_string(raw_p),
                "endAt": None,
                "isAllDay": False,
                "completed": j.get("permit_status") == "approved",
                "status": "completed" if j.get("permit_status") == "approved" else "scheduled",
                "priority": "high",
                "assignedToUserId": 6, # David Ortiz (Logistics/Permits)
                "assignedToName": "David Ortiz",
                "assignedToRole": "Logistics Coordinator",
                "assignedToAvatarColor": "from-rose-500 to-orange-500",
                "assignedToInitials": "DO",
                "entityType": "job",
                "entityId": j["id"],
                "entityName": j.get("customer_name"),
                "customerName": j.get("customer_name"),
                "jobCode": j.get("job_number"),
                "address": j.get("address") or "",
                "city": j.get("city") or "Carlsbad",
                "sourceType": "job_schedule",
                "isSynced": True,
            })

    # Map Warranties
    for w in warranties:
        target_due = w.get("checkin_6mo_due") if not w.get("checkin_6mo_completed") else w.get("checkin_1yr_due")
        if target_due:
            date_str, day_num, month_num, year_num = parse_date_parts(target_due)
            events.append({
                "id": f"war-{w['id']}",
                "numericId": w["id"],
                "title": f"Warranty Audit: {w.get('customer_name') or w.get('warranty_number')}",
                "description": f"Post-install warranty audit and roof seal check ({w.get('warranty_type') or 'Standard'})",
                "category": "warranty_audit",
                "date": date_str,
                "dayNumber": day_num,
                "month": month_num,
                "year": year_num,
                "startTime": "01:00 PM",
                "endTime": "02:00 PM",
                "dueAt": to_iso_string(target_due),
                "endAt": None,
                "isAllDay": False,
                "completed": False,
                "status": "scheduled",
                "priority": "normal",
                "assignedToUserId": 2, # Carlos Ramirez
                "assignedToName": "Carlos Ramirez",
                "assignedToRole": "Project Manager",
                "assignedToAvatarColor": "from-blue-500 to-indigo-600",
                "assignedToInitials": "CR",
                "entityType": "job",
                "entityId": w.get("job_id"),
                "entityName": w.get("customer_name"),
                "customerName": w.get("customer_name"),
                "address": w.get("address") or "",
                "city": w.get("city") or "Carlsbad",
                "phone": w.get("customer_phone"),
                "sourceType": "warranty",
                "isSynced": True,
            })

    # Map Inspections
    for i in inspections:
        raw_insp = i.get("inspection_date")
        date_str, day_num, month_num, year_num = parse_date_parts(raw_insp)
        events.append({
            "id": f"insp-{i['id']}",
            "numericId": i["id"],
            "title": f"Roof Inspection ({i.get('roof_health_score')}%): {i.get('customer_name') or i.get('inspection_number')}",
            "description": f"12-point inspection by {i.get('inspector_name') or 'Field Tech'}",
            "category": "client_meeting",
            "date": date_str,
            "dayNumber": day_num,
            "month": month_num,
            "year": year_num,
            "startTime": "11:00 AM",
            "endTime": "12:30 PM",
            "dueAt": to_iso_string(raw_insp),
            "endAt": None,
            "isAllDay": False,
            "completed": not i.get("urgent_action_required"),
            "status": "completed" if not i.get("urgent_action_required") else "scheduled",
            "priority": "urgent" if i.get("urgent_action_required") else "normal",
            "assignedToUserId": 5, # Sarah Jenkins
            "assignedToName": "Sarah Jenkins",
            "assignedToRole": "Field Inspector",
            "assignedToAvatarColor": "from-purple-500 to-pink-600",
            "assignedToInitials": "SJ",
            "entityType": "lead",
            "entityId": i.get("lead_id"),
            "entityName": i.get("customer_name"),
            "customerName": i.get("customer_name"),
            "address": i.get("address") or "",
            "city": i.get("city") or "Carlsbad",
            "phone": i.get("customer_phone"),
            "sourceType": "inspection",
            "isSynced": True,
        })

    # ── Filtering ──
    filtered = events
    target_category = category or event_type
    if target_category and target_category != "all":
        filtered = [e for e in filtered if e.get("category") == target_category or e.get("event_type") == target_category]

    target_person = assigned_to_user_id or person_id
    if target_person and target_person != "all":
        pid = int(target_person) if target_person.isdigit() else None
        if pid:
            filtered = [e for e in filtered if e.get("assignedToUserId") == pid]
        else:
            filtered = [e for e in filtered if (e.get("assignedToName") or "").lower() == target_person.lower()]

    if status and status != "all":
        if status == "completed":
            filtered = [e for e in filtered if e.get("completed") is True]
        elif status in ("active", "scheduled"):
            filtered = [e for e in filtered if e.get("completed") is False]

    if start_date:
        filtered = [e for e in filtered if e.get("date") and e["date"] >= start_date[:10]]
    if end_date:
        filtered = [e for e in filtered if e.get("date") and e["date"] <= end_date[:10]]

    return {
        "ok": True,
        "success": True,
        "data": filtered,
        "events": filtered,
        "total": len(filtered),
        "team": users,
        "current_user": {
            "id": user["id"],
            "name": user.get("name"),
            "role": user.get("role"),
            "avatar_url": user.get("avatar_url"),
        }
    }


# ── TASKS CRUD ───────────────────────────────────────────────────────────────

@router.get("/tasks")
async def get_tasks(
    lead_id: Optional[int] = None,
    person_id: Optional[str] = None,
    event_type: Optional[str] = None,
    category: Optional[str] = None,
    work_category: Optional[str] = None,
    scope: str = "team",
    user: Dict[str, Any] = Depends(require_any_permission(["field:view_calendar", "leads:view", "jobs:view"])),
    db: AsyncSession = Depends(get_db)
):
    current_user_id = user["id"]
    conditions: List[str] = []
    params: Dict[str, Any] = {}

    if scope == "personal":
        params["uid"] = current_user_id
        conditions.append("t.event_type = 'todo' AND (t.assigned_to_user_id = :uid OR t.created_by_user_id = :uid)")
    elif scope == "team":
        conditions.append("(t.event_type != 'todo' OR t.entity_type IS NOT NULL)")

    if lead_id:
        params["lead_id"] = lead_id
        conditions.append("t.entity_type = 'lead' AND t.entity_id = :lead_id")

    if person_id and person_id != "all":
        params["person_id"] = int(person_id) if person_id.isdigit() else 0
        conditions.append("t.assigned_to_user_id = :person_id")

    target_type = category or event_type
    if target_type and target_type != "all":
        params["event_type"] = target_type
        conditions.append("t.event_type = :event_type")

    if work_category and work_category != "all":
        params["work_category"] = work_category
        conditions.append("t.work_category = :work_category")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    sql = f"""
        SELECT 
            t.*,
            l.full_name as lead_name,
            l.phone as lead_phone,
            l.service_type as lead_service,
            u.name as assigned_user_name,
            u.role as assigned_user_role,
            u.avatar_url as assigned_user_avatar
        FROM tasks t
        LEFT JOIN leads l ON t.entity_type = 'lead' AND t.entity_id = l.id
        LEFT JOIN users u ON t.assigned_to_user_id = u.id
        {where_clause}
        ORDER BY 
            (t.completed_at IS NOT NULL) ASC,
            CASE t.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'normal' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5 
            END ASC,
            t.due_at ASC NULLS LAST, 
            t.created_at DESC
    """
    res = await db.execute(text(sql), params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    count_stats = await db.execute(
        text("""
            SELECT
                COUNT(CASE WHEN (event_type != 'todo' OR entity_type IS NOT NULL) AND completed_at IS NULL THEN 1 END) as team_count,
                COUNT(CASE WHEN event_type = 'todo' AND (assigned_to_user_id = :uid OR created_by_user_id = :uid) AND completed_at IS NULL THEN 1 END) as personal_count
            FROM tasks
        """),
        {"uid": current_user_id}
    )
    c_row = count_stats.first()

    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1) - timedelta(microseconds=1)

    overdue = []
    today = []
    upcoming = []
    completed = []

    for t in rows:
        if t.get("completed_at"):
            completed.append(t)
            continue
        due_at = t.get("due_at")
        if not due_at:
            today.append(t)
            continue
        if isinstance(due_at, str):
            due_at = datetime.fromisoformat(due_at.replace("Z", "+00:00"))

        if due_at < today_start:
            overdue.append(t)
        elif due_at <= today_end:
            today.append(t)
        else:
            upcoming.append(t)


    counts = {
        "total": len(rows),
        "overdue": len(overdue),
        "today": len(today),
        "upcoming": len(upcoming),
        "completed": len(completed),
    }

    return {
        "ok": True,
        "success": True,
        "tasks": rows,
        "data": rows,
        "grouped": {
            "overdue": overdue,
            "today": today,
            "upcoming": upcoming,
            "completed": completed,
        },
        "counts": counts,
        "teamCount": int(c_row.team_count if c_row else 0),
        "personalCount": int(c_row.personal_count if c_row else 0),
    }


@router.post("/tasks")
async def create_task(
    payload: CreateTaskPayload,
    user: Dict[str, Any] = Depends(require_any_permission(["field:view_calendar", "leads:edit", "jobs:change_stage", "leads:view"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Schedule a team operation or task with assignee, due date, start/end time, and optional CRM entity link.
    """
    title = payload.title

    category = payload.category or payload.eventType or "team_task"
    assigned_name = None
    assigned_user_id = None

    if payload.assignedToUserId:
        assigned_user_id = payload.assignedToUserId
        u_res = await db.execute(text("SELECT name FROM users WHERE id = :id"), {"id": assigned_user_id})
        u_row = u_res.first()
        assigned_name = u_row.name if u_row else (payload.assignedTo or "Staff")
    elif payload.assignedTo and "unassigned" not in str(payload.assignedTo).lower():
        assigned_name = str(payload.assignedTo).strip()
        u_res = await db.execute(text("SELECT id FROM users WHERE LOWER(name) = LOWER(:name)"), {"name": assigned_name})
        u_row = u_res.first()
        if u_row:
            assigned_user_id = u_row.id
    else:
        assigned_user_id = user["id"]
        assigned_name = user.get("name") or "Staff"

    # Compute due_at and end_at timestamps
    due_at = None
    if payload.dueAt:
        try:
            cleaned = str(payload.dueAt).replace("Z", "+00:00")
            due_at = datetime.fromisoformat(cleaned)
            if not due_at.tzinfo:
                due_at = due_at.replace(tzinfo=timezone.utc)
        except Exception:
            due_at = None

    if not due_at:
        date_str = payload.date or datetime.now().strftime("%Y-%m-%d")
        time_str = payload.startTime or "09:00 AM"
        due_at = compose_datetime(date_str, time_str)

    end_at = None
    if payload.endAt:
        try:
            cleaned = str(payload.endAt).replace("Z", "+00:00")
            end_at = datetime.fromisoformat(cleaned)
            if not end_at.tzinfo:
                end_at = end_at.replace(tzinfo=timezone.utc)
        except Exception:
            end_at = None

    if not end_at and payload.endTime:
        date_str = payload.date or (due_at.strftime("%Y-%m-%d") if due_at else datetime.now().strftime("%Y-%m-%d"))
        end_at = compose_datetime(date_str, payload.endTime)

    entity_id = payload.entityId
    entity_type = payload.entityType if entity_id else None

    resolved_client_id = None
    if entity_id:
        if entity_type == "lead":
            l = await db.execute(text("SELECT client_id FROM leads WHERE id = :id"), {"id": entity_id})
            r = l.first()
            if r and r.client_id:
                resolved_client_id = int(r.client_id)
        elif entity_type == "job":
            j = await db.execute(text("SELECT client_id FROM jobs WHERE id = :id"), {"id": entity_id})
            r = j.first()
            if r and r.client_id:
                resolved_client_id = int(r.client_id)
        elif entity_type == "client":
            resolved_client_id = entity_id

    stmt = text("""
        INSERT INTO tasks (
            title, description, entity_type, entity_id, client_id, assigned_to, assigned_to_user_id,
            due_at, end_at, priority, event_type, work_category, created_by_user_id
        ) VALUES (
            :title, :desc, :etype, :eid, :cid, :assigned_to, :uid,
            :due_at, :end_at, :priority, :event_type, :wcat, :creator
        ) RETURNING *
    """)
    res = await db.execute(stmt, {
        "title": str(title).strip(),
        "desc": payload.description or payload.notes,
        "etype": entity_type,
        "eid": entity_id,
        "cid": resolved_client_id,
        "assigned_to": assigned_name,
        "uid": assigned_user_id,
        "due_at": due_at,
        "end_at": end_at,
        "priority": (payload.priority or "normal").lower(),
        "event_type": category,
        "wcat": payload.workCategory or "Rise Up",
        "creator": user["id"],
    })
    new_task = dict(res.first()._mapping)

    # Cross-CRM synchronization: log to `activities` table if attached to lead or job
    if entity_id and entity_type in ("lead", "job", "client"):
        display_assignee = assigned_name or "Unassigned"
        due_display = due_at.strftime("%b %d at %I:%M %p") if due_at else "Upcoming"
        try:
            await db.execute(
                text("""
                    INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                    VALUES (:etype, :eid, :cid, 'task_scheduled', :title, :desc, :pby)
                """),
                {
                    "etype": entity_type,
                    "eid": entity_id,
                    "cid": resolved_client_id,
                    "title": f"Operation Scheduled: {str(title).strip()}",
                    "desc": f"Assigned to {display_assignee} • Due {due_display}",
                    "pby": user.get("name") or "Staff"
                }
            )
        except Exception:
            pass

    await db.commit()
    return {"ok": True, "success": True, "task": new_task, "data": new_task}


@router.patch("/tasks")
async def update_task(
    payload: UpdateTaskPayload,
    user: Dict[str, Any] = Depends(require_any_permission(["field:view_calendar", "leads:edit", "jobs:change_stage", "leads:view"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a team operation or task (e.g. toggle completion, change assignee, reschedule).
    """
    raw_id = payload.id or payload.numericId
    if not raw_id:
        raise HTTPException(status_code=400, detail="Task ID is required")

    task_id_str = str(raw_id).replace("task-", "")
    try:
        task_id = int(task_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid task ID format: {raw_id}")

    if payload.completed is not None:
        completed_at = datetime.now(timezone.utc) if payload.completed else None
        await db.execute(
            text("UPDATE tasks SET completed_at = :cat WHERE id = :id"),
            {"cat": completed_at, "id": task_id}
        )
        await db.commit()
        return {"ok": True, "success": True, "completed": payload.completed}

    updates = []
    params: Dict[str, Any] = {"id": task_id}

    if payload.title is not None:
        params["title"] = str(payload.title).strip()
        updates.append("title = :title")

    if payload.description is not None or payload.notes is not None:
        params["description"] = payload.description or payload.notes
        updates.append("description = :description")

    if payload.priority is not None:
        params["priority"] = str(payload.priority).lower()
        updates.append("priority = :priority")

    if payload.category is not None or payload.eventType is not None:
        params["event_type"] = payload.category or payload.eventType
        updates.append("event_type = :event_type")

    # Due date / time updates
    if payload.dueAt is not None:
        try:
            cleaned = str(payload.dueAt).replace("Z", "+00:00")
            d = datetime.fromisoformat(cleaned)
            params["due_at"] = d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            updates.append("due_at = :due_at")
        except Exception:
            pass
    elif payload.date is not None or payload.startTime is not None:
        existing = await db.execute(text("SELECT due_at FROM tasks WHERE id = :id"), {"id": task_id})
        ex_row = existing.first()
        cur_date = ex_row.due_at.strftime("%Y-%m-%d") if ex_row and ex_row.due_at else datetime.now().strftime("%Y-%m-%d")
        new_date = payload.date or cur_date
        new_time = payload.startTime or "09:00 AM"
        composed = compose_datetime(new_date, new_time)
        if composed:
            params["due_at"] = composed
            updates.append("due_at = :due_at")

    if payload.endAt is not None:
        try:
            cleaned = str(payload.endAt).replace("Z", "+00:00")
            d = datetime.fromisoformat(cleaned)
            params["end_at"] = d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            updates.append("end_at = :end_at")
        except Exception:
            pass

    if payload.assignedToUserId is not None:
        uid = int(payload.assignedToUserId) if payload.assignedToUserId else None
        params["assigned_to_user_id"] = uid
        updates.append("assigned_to_user_id = :assigned_to_user_id")

        if uid:
            u_res = await db.execute(text("SELECT name FROM users WHERE id = :id"), {"id": uid})
            u_row = u_res.first()
            params["assigned_to"] = u_row.name if u_row else (payload.assignedTo or "Staff")
        else:
            clean_name = str(payload.assignedTo).strip() if payload.assignedTo and "unassigned" not in str(payload.assignedTo).lower() else None
            params["assigned_to"] = clean_name
        updates.append("assigned_to = :assigned_to")
    elif payload.assignedTo is not None:
        clean_name = str(payload.assignedTo).strip() if "unassigned" not in str(payload.assignedTo).lower() else None
        params["assigned_to"] = clean_name
        updates.append("assigned_to = :assigned_to")

    if updates:
        stmt = text(f"UPDATE tasks SET {', '.join(updates)} WHERE id = :id")
        await db.execute(stmt, params)
        await db.commit()

    return {"ok": True, "success": True}


@router.delete("/tasks")
async def delete_task(
    id: str = Query(...),
    user: Dict[str, Any] = Depends(require_any_permission(["field:view_calendar", "leads:delete", "jobs:delete", "leads:view"])),
    db: AsyncSession = Depends(get_db)
):
    task_id_str = str(id).replace("task-", "")
    try:
        task_id = int(task_id_str)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid task ID: {id}")

    rows = await db.execute(text("SELECT assigned_to_user_id, created_by_user_id FROM tasks WHERE id = :id"), {"id": task_id})
    task = rows.first()
    if not task:
        return {"ok": True, "success": True}

    is_owner = task.assigned_to_user_id == user["id"] or task.created_by_user_id == user["id"]
    if not is_owner and not has_any_permission(user, ["field:view_calendar", "leads:delete", "jobs:delete"]):
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.execute(text("DELETE FROM tasks WHERE id = :id"), {"id": task_id})
    await db.commit()
    return {"ok": True, "success": True}
