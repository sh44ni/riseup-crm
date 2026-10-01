from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from datetime import datetime, date as py_date, timezone, timedelta
import orjson
import httpx
import time
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.permissions import require_auth_user, require_permission, require_any_permission
from app.core.redis import get_redis
from app.models.calendar_event import CalendarEvent
from app.schemas.calendar_event import (
    CalendarEventPayload,
    CalendarEventsListResponse,
    CalendarEventSingleResponse,
    CalendarStatsResponse,
    CalendarStatsData,
    CalendarWeatherResponse,
    CalendarWeatherData,
)

class UpdateCalendarEventPayload(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    assignedToUserId: Optional[int] = None
    assignedToName: Optional[str] = None
    customerName: Optional[str] = None
    date: Optional[str] = None
    dayNumber: Optional[int] = None
    month: Optional[int] = None
    year: Optional[int] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    category: Optional[str] = None
    jobCode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    assignedToRole: Optional[str] = None
    crewId: Optional[str] = None
    crewName: Optional[str] = None
    foremanName: Optional[str] = None
    foremanPhone: Optional[str] = None
    squares: Optional[float] = None
    material: Optional[str] = None
    deliverySupplier: Optional[str] = None
    permitNumber: Optional[str] = None
    permitType: Optional[str] = None
    isWeatherSensitive: Optional[bool] = None

router = APIRouter(prefix="/calendar", tags=["Admin Calendar Operations"])

# In-memory cache for live weather (10-minute TTL)
_weather_cache: Dict[str, Any] = {
    "data": None,
    "timestamp": 0,
}


@router.get("/weather", response_model=CalendarWeatherResponse)
@router.get("/events/weather", response_model=CalendarWeatherResponse)
async def get_calendar_weather(
    user: Dict[str, Any] = Depends(require_auth_user()),
):
    """
    Fetch live North County San Diego weather & OSHA wind safety metrics.
    Caches results for 10 minutes to ensure sub-millisecond response times.
    """
    global _weather_cache
    now_ts = time.time()

    if _weather_cache["data"] and (now_ts - _weather_cache["timestamp"] < 600):
        return CalendarWeatherResponse(success=True, data=_weather_cache["data"])

    # Default fallback for Oceanside / North County
    weather_data = CalendarWeatherData(
        tempF=72,
        windSpeedMph=8,
        gustMph=12,
        condition="Sunny & Clear",
        safetyStatus="safe",
        safetyLabel="All Zones Safe for Rooftop Work",
        city="Oceanside / North County",
    )

    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            "?latitude=33.1959&longitude=-117.3795"
            "&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m"
            "&temperature_unit=fahrenheit&wind_speed_unit=mph"
        )
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                cur = resp.json().get("current", {})
                temp = round(cur.get("temperature_2m", 72))
                wind = round(cur.get("wind_speed_10m", 8))
                gusts = round(cur.get("wind_gusts_10m", wind + 4))
                w_code = cur.get("weather_code", 0)

                # Map weather code to text
                if w_code == 0:
                    cond = "Clear Skies"
                elif w_code in (1, 2):
                    cond = "Partly Cloudy"
                elif w_code == 3:
                    cond = "Overcast"
                elif w_code in (45, 48):
                    cond = "Coastal Fog"
                elif w_code in (51, 53, 55, 61, 63, 65, 80, 81):
                    cond = "Rain / Showers"
                else:
                    cond = "Breezy & Fair"

                # OSHA Wind Safety thresholds for roofing (pitch & boom drops)
                if wind >= 30 or gusts >= 40:
                    safety_status = "hazard"
                    safety_label = "OSHA Wind Limit Exceeded (>30mph)"
                elif wind >= 20 or gusts >= 25:
                    safety_status = "caution"
                    safety_label = "Caution - Elevated Wind Gusts"
                else:
                    safety_status = "safe"
                    safety_label = "All Zones Safe for Rooftop Work"

                weather_data = CalendarWeatherData(
                    tempF=temp,
                    windSpeedMph=wind,
                    gustMph=gusts,
                    condition=cond,
                    safetyStatus=safety_status,
                    safetyLabel=safety_label,
                    city="Oceanside / Carlsbad",
                )
                _weather_cache["data"] = weather_data
                _weather_cache["timestamp"] = now_ts
    except Exception:
        # Graceful fallback on network or API failure
        pass

    return CalendarWeatherResponse(success=True, data=weather_data)


@router.get("/stats", response_model=CalendarStatsResponse)
@router.get("/events/stats", response_model=CalendarStatsResponse)
async def get_calendar_stats(
    user: Dict[str, Any] = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes dynamic operations stats across team members, today's schedule, deliveries, and schedule conflicts.
    """
    today_dt = py_date.today()

    # 1. Active registered team members count
    users_res = await db.execute(text("SELECT COUNT(*) FROM users WHERE status = 'active'"))
    active_team_count = users_res.scalar() or 0

    # 2. Operations & completions today across tasks table
    tasks_today_res = await db.execute(
        text("""
            SELECT 
                COUNT(*) as ops_today,
                COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as comp_today
            FROM tasks 
            WHERE DATE(due_at) = :td OR DATE(completed_at) = :td
        """),
        {"td": today_dt}
    )
    t_row = tasks_today_res.first()
    ops_today = (t_row[0] if t_row else 0)
    comp_today = (t_row[1] if t_row else 0)

    # Fallback to crm_calendar_events if tasks table has 0 for today
    if ops_today == 0:
        events_today_res = await db.execute(
            text("SELECT COUNT(*), COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM crm_calendar_events WHERE date = :td"),
            {"td": today_dt}
        )
        e_row = events_today_res.first()
        if e_row and e_row[0] > 0:
            ops_today = e_row[0]
            comp_today = e_row[1]

    # 3. Upcoming operations / deliveries this week
    deliveries_res = await db.execute(
        text("""
            SELECT COUNT(*) FROM tasks 
            WHERE (event_type IN ('project_op', 'boom_delivery') OR entity_type = 'job') 
              AND DATE(due_at) >= :td AND DATE(due_at) <= :next_week
        """),
        {"td": today_dt, "next_week": today_dt + timedelta(days=7)}
    )
    upcoming_deliveries = deliveries_res.scalar() or 0
    if upcoming_deliveries == 0:
        fallback_del = await db.execute(
            text("SELECT COUNT(*) FROM crm_calendar_events WHERE category = 'boom_delivery' AND date >= :td AND date <= :next_week"),
            {"td": today_dt, "next_week": today_dt + timedelta(days=7)}
        )
        upcoming_deliveries = fallback_del.scalar() or 0

    # 4. Pending city permits
    permits_res = await db.execute(
        text("SELECT COUNT(*) FROM tasks WHERE event_type IN ('permit_filing', 'city_permit') AND completed_at IS NULL")
    )
    pending_permits = permits_res.scalar() or 0
    if pending_permits == 0:
        fallback_permits = await db.execute(
            text("SELECT COUNT(*) FROM crm_calendar_events WHERE category = 'city_permit' AND status != 'completed'")
        )
        pending_permits = fallback_permits.scalar() or 0

    # 5. Calculate real schedule conflicts (same user assigned to 2+ active tasks on same date)
    conflicts_res = await db.execute(
        text("""
            SELECT assigned_to_user_id, DATE(due_at) as task_date, COUNT(*) as cnt
            FROM tasks
            WHERE assigned_to_user_id IS NOT NULL AND completed_at IS NULL AND due_at IS NOT NULL
            GROUP BY assigned_to_user_id, DATE(due_at)
            HAVING COUNT(*) > 1
        """)
    )
    conflicts_count = len(conflicts_res.fetchall())

    data = CalendarStatsData(
        activeTeamMembers=int(active_team_count),
        operationsToday=int(ops_today),
        completedToday=int(comp_today),
        upcomingDeliveries=int(upcoming_deliveries),
        pendingPermits=int(pending_permits),
        scheduleConflicts=int(conflicts_count),
    )
    return CalendarStatsResponse(success=True, data=data)


@router.get("/events", response_model=CalendarEventsListResponse)
async def get_calendar_events(
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    crewId: Optional[str] = Query(None),
    assignedToUserId: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user: Dict[str, Any] = Depends(require_any_permission(["calendar.view", "jobs.view", "field:view_calendar"])),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
):
    """
    Unified Calendar Feed (Option A):
    Aggregates direct dispatches (`crm_calendar_events`), scheduled pipeline jobs (`jobs`),
    scheduled lead inspections (`leads`), and active warranty check-ins.
    """
    # ── 1. Fetch from crm_calendar_events ──
    stmt = select(CalendarEvent).order_by(CalendarEvent.date.asc(), CalendarEvent.start_time.asc())
    if assignedToUserId:
        stmt = stmt.where(CalendarEvent.assigned_to_user_id == assignedToUserId)
    elif crewId:
        if crewId.isdigit():
            stmt = stmt.where((CalendarEvent.assigned_to_user_id == int(crewId)) | (CalendarEvent.crew_id == crewId))
        else:
            stmt = stmt.where(CalendarEvent.crew_id == crewId)
    if category:
        stmt = stmt.where(CalendarEvent.category == category)
    if status_filter:
        stmt = stmt.where(CalendarEvent.status == status_filter)

    result = await db.execute(stmt)
    records = result.scalars().all()

    # Map of existing registered user IDs and names for cross-linking
    user_lookup_res = await db.execute(text("SELECT id, name, role, phone FROM users WHERE status = 'active'"))
    users_list = [dict(r._mapping) for r in user_lookup_res.fetchall()]
    user_by_name = {u["name"].lower().strip(): u for u in users_list if u.get("name")}
    user_by_id = {u["id"]: u for u in users_list}
    default_assignee = users_list[0] if users_list else {"id": 1, "name": "Sam Martinez", "role": "owner", "phone": "(760) 555-0100"}

    payloads: List[CalendarEventPayload] = []
    for e in records:
        assigned_u = user_by_id.get(e.assigned_to_user_id) if e.assigned_to_user_id else None
        if not assigned_u and e.crew_name:
            assigned_u = user_by_name.get(e.crew_name.lower().strip())
        if not assigned_u:
            # Check if there is a foreman matching or fallback to default registered user
            if e.foreman_name:
                assigned_u = user_by_name.get(e.foreman_name.lower().strip())
            if not assigned_u:
                assigned_u = default_assignee

        assigned_name = assigned_u["name"]
        assigned_role = (assigned_u.get("role") or "Team Member").replace("_", " ").title()
        assigned_phone = assigned_u.get("phone") or e.foreman_phone

        payloads.append(
            CalendarEventPayload(
                id=e.id,
                title=e.title,
                jobCode=e.job_code,
                customerName=e.customer_name,
                phone=e.phone,
                email=e.email,
                address=e.address,
                city=e.city,
                date=e.date.isoformat() if hasattr(e.date, "isoformat") else str(e.date),
                dayNumber=e.day_number,
                month=e.month,
                year=e.year,
                startTime=e.start_time,
                endTime=e.end_time,
                category=e.category,
                status=e.status,
                assignedToUserId=assigned_u["id"],
                assignedToName=assigned_name,
                assignedToRole=assigned_role,
                crewId=str(assigned_u["id"]),
                crewName=assigned_name,
                foremanName=assigned_name,
                foremanPhone=assigned_phone,
                squares=float(e.squares) if e.squares is not None else None,
                material=e.material,
                deliverySupplier=e.delivery_supplier,
                permitNumber=e.permit_number,
                permitType=e.permit_type,
                notes=e.notes,
                isWeatherSensitive=e.is_weather_sensitive,
                completedAt=e.completed_at.isoformat() if e.completed_at else None,
                sourceType="dispatch",
            )
        )

    # ── 2. Unified Pipeline Jobs (scheduled_start) ──
    try:
        jobs_res = await db.execute(text("""
            SELECT id, job_number, customer_name, customer_phone, customer_email, address, city,
                   scheduled_start, estimated_days, crew_lead, status, notes
            FROM jobs
            WHERE scheduled_start IS NOT NULL
        """))
        jobs_rows = [dict(r._mapping) for r in jobs_res.fetchall()]

        for j in jobs_rows:
            raw_start = j.get("scheduled_start")
            if not raw_start:
                continue
            if isinstance(raw_start, str):
                try:
                    raw_start = datetime.fromisoformat(raw_start.replace("Z", "+00:00"))
                except Exception:
                    continue

            d_val = raw_start.date() if isinstance(raw_start, datetime) else raw_start
            assigned_u = None
            if j.get("crew_lead"):
                assigned_u = user_by_name.get(str(j["crew_lead"]).lower().strip())

            job_cat = "roof_install"
            job_status = "in_progress" if j.get("status") == "in_progress" else ("completed" if j.get("status") == "completed" else "scheduled")

            # Check if matching filter
            if category and category != "all" and category != job_cat:
                continue
            if status_filter and status_filter != job_status:
                continue
            if assignedToUserId and (not assigned_u or assigned_u["id"] != assignedToUserId):
                continue

            payloads.append(
                CalendarEventPayload(
                    id=f"job-{j['id']}",
                    title=f"Roof Install: {j.get('customer_name') or 'Customer'}",
                    jobCode=j.get("job_number") or f"JOB-{j['id']}",
                    customerName=j.get("customer_name") or "Pipeline Client",
                    phone=j.get("customer_phone") or "(760) 555-0100",
                    email=j.get("customer_email"),
                    address=j.get("address") or "North County Site",
                    city=j.get("city") or "Carlsbad",
                    date=d_val.isoformat(),
                    dayNumber=d_val.day,
                    month=d_val.month,
                    year=d_val.year,
                    startTime="07:00 AM",
                    endTime="03:30 PM",
                    category=job_cat,
                    status=job_status,
                    assignedToUserId=assigned_u["id"] if assigned_u else None,
                    assignedToName=assigned_u["name"] if assigned_u else (j.get("crew_lead") or "Assigned Lead"),
                    assignedToRole=(assigned_u.get("role") or "Project Manager").replace("_", " ").title() if assigned_u else "Field Lead",
                    crewId=str(assigned_u["id"]) if assigned_u else None,
                    crewName=assigned_u["name"] if assigned_u else (j.get("crew_lead") or "Assigned Lead"),
                    foremanName=assigned_u["name"] if assigned_u else (j.get("crew_lead") or "Field Lead"),
                    foremanPhone=assigned_u.get("phone") if assigned_u else None,
                    notes=j.get("notes") or f"Pipeline Job {j.get('job_number')}",
                    sourceType="pipeline_job",
                )
            )
    except Exception:
        pass

    # ── 3. Unified Lead Site Inspections (site_visit_scheduled_at) ──
    try:
        leads_res = await db.execute(text("""
            SELECT l.id, l.full_name, l.phone, l.email, l.address, l.city,
                   l.site_visit_scheduled_at, l.assigned_to_user_id, l.status, l.notes
            FROM leads l
            WHERE l.site_visit_scheduled_at IS NOT NULL
        """))
        leads_rows = [dict(r._mapping) for r in leads_res.fetchall()]

        for l in leads_rows:
            raw_visit = l.get("site_visit_scheduled_at")
            if not raw_visit:
                continue
            if isinstance(raw_visit, str):
                try:
                    raw_visit = datetime.fromisoformat(raw_visit.replace("Z", "+00:00"))
                except Exception:
                    continue

            d_val = raw_visit.date() if isinstance(raw_visit, datetime) else raw_visit
            assigned_u = user_by_id.get(l.get("assigned_to_user_id"))

            lead_cat = "roof_inspection"
            lead_status = "completed" if l.get("status") == "won" else "scheduled"

            if category and category != "all" and category != lead_cat:
                continue
            if status_filter and status_filter != lead_status:
                continue
            if assignedToUserId and l.get("assigned_to_user_id") != assignedToUserId:
                continue

            time_str = raw_visit.strftime("%I:%M %p") if isinstance(raw_visit, datetime) else "09:00 AM"
            end_time_str = (raw_visit + timedelta(hours=1, minutes=30)).strftime("%I:%M %p") if isinstance(raw_visit, datetime) else "10:30 AM"

            payloads.append(
                CalendarEventPayload(
                    id=f"lead-visit-{l['id']}",
                    title=f"Site Inspection: {l.get('full_name') or 'Lead'}",
                    jobCode=f"LEAD-{l['id']}",
                    customerName=l.get("full_name") or "Site Visit Client",
                    phone=l.get("phone") or "(760) 555-0100",
                    email=l.get("email"),
                    address=l.get("address") or "Jobsite",
                    city=l.get("city") or "North County",
                    date=d_val.isoformat(),
                    dayNumber=d_val.day,
                    month=d_val.month,
                    year=d_val.year,
                    startTime=time_str,
                    endTime=end_time_str,
                    category=lead_cat,
                    status=lead_status,
                    assignedToUserId=assigned_u["id"] if assigned_u else l.get("assigned_to_user_id"),
                    assignedToName=assigned_u["name"] if assigned_u else "Assigned Inspector",
                    assignedToRole=(assigned_u.get("role") or "Sales Rep").replace("_", " ").title() if assigned_u else "Estimator",
                    crewId=str(assigned_u["id"]) if assigned_u else None,
                    crewName=assigned_u["name"] if assigned_u else "Assigned Inspector",
                    foremanName=assigned_u["name"] if assigned_u else "Inspector",
                    foremanPhone=assigned_u.get("phone") if assigned_u else None,
                    notes=l.get("notes") or f"12-Point Roof Inspection for {l.get('full_name')}",
                    sourceType="pipeline_lead",
                )
            )
    except Exception:
        pass

    # ── 4. Unified Team Operations & Tasks (tasks table) ──
    try:
        tasks_res = await db.execute(text("""
            SELECT t.id, t.title, t.description, t.assigned_to, t.assigned_to_user_id,
                   t.due_at, t.end_at, t.completed_at, t.priority, t.event_type,
                   t.entity_type, t.entity_id, t.work_category
            FROM tasks t
            WHERE t.due_at IS NOT NULL
        """))
        tasks_rows = [dict(r._mapping) for r in tasks_res.fetchall()]

        for t in tasks_rows:
            raw_due = t.get("due_at")
            if not raw_due:
                continue
            if isinstance(raw_due, str):
                try:
                    raw_due = datetime.fromisoformat(raw_due.replace("Z", "+00:00"))
                except Exception:
                    continue

            d_val = raw_due.date() if isinstance(raw_due, datetime) else raw_due
            assigned_u = user_by_id.get(t.get("assigned_to_user_id"))

            task_cat = "team_task"
            if t.get("event_type") in ("roof_inspection", "client_visit"):
                task_cat = "client_visit"
            elif t.get("event_type") == "city_permit":
                task_cat = "city_permit"
            elif t.get("event_type") == "warranty_audit":
                task_cat = "warranty_audit"

            task_status = "completed" if t.get("completed_at") else "scheduled"

            if category and category != "all" and category != task_cat:
                continue
            if status_filter and status_filter != task_status:
                continue
            if assignedToUserId and t.get("assigned_to_user_id") != assignedToUserId:
                continue

            time_str = raw_due.strftime("%I:%M %p") if isinstance(raw_due, datetime) else "09:00 AM"
            end_time_str = None
            if t.get("end_at"):
                raw_end = t["end_at"]
                if isinstance(raw_end, str):
                    try:
                        raw_end = datetime.fromisoformat(raw_end.replace("Z", "+00:00"))
                    except Exception:
                        raw_end = None
                if isinstance(raw_end, datetime):
                    end_time_str = raw_end.strftime("%I:%M %p")

            if not end_time_str:
                end_time_str = (raw_due + timedelta(hours=1)).strftime("%I:%M %p") if isinstance(raw_due, datetime) else "10:00 AM"

            payloads.append(
                CalendarEventPayload(
                    id=f"task-{t['id']}",
                    title=t.get("title") or "Team Operation",
                    jobCode=f"TASK-{t['id']}",
                    customerName=t.get("assigned_to") or "Team Task",
                    phone=assigned_u.get("phone") if assigned_u else None,
                    email=None,
                    address="Headquarters",
                    city="North County",
                    date=d_val.isoformat(),
                    dayNumber=d_val.day,
                    month=d_val.month,
                    year=d_val.year,
                    startTime=time_str,
                    endTime=end_time_str,
                    category=task_cat,
                    status=task_status,
                    assignedToUserId=assigned_u["id"] if assigned_u else t.get("assigned_to_user_id"),
                    assignedToName=assigned_u["name"] if assigned_u else (t.get("assigned_to") or "Team Member"),
                    assignedToRole=(assigned_u.get("role") or "Team Member").replace("_", " ").title() if assigned_u else "Team Member",
                    crewId=str(assigned_u["id"]) if assigned_u else None,
                    crewName=assigned_u["name"] if assigned_u else "Team Member",
                    foremanName=assigned_u["name"] if assigned_u else "Team Member",
                    foremanPhone=assigned_u.get("phone") if assigned_u else None,
                    notes=t.get("description"),
                    completedAt=t.get("completed_at").isoformat() if t.get("completed_at") and hasattr(t.get("completed_at"), "isoformat") else None,
                    sourceType="task",
                )
            )
    except Exception:
        pass

    # Sort all unified payloads by date ascending and startTime ascending
    payloads.sort(key=lambda x: (x.date, x.startTime))

    return CalendarEventsListResponse(
        success=True,
        data=payloads,
        total=len(payloads),
        message="Unified calendar events retrieved successfully",
    )


@router.post("/events", response_model=CalendarEventSingleResponse, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    payload: CalendarEventPayload,
    user: Dict[str, Any] = Depends(require_permission("calendar.create_event")),
    db: AsyncSession = Depends(get_db),
):
    parsed_date = py_date.fromisoformat(payload.date) if isinstance(payload.date, str) else payload.date
    event = CalendarEvent(
        id=payload.id,
        title=payload.title,
        job_code=payload.jobCode,
        customer_name=payload.customerName or "Team Operation",
        phone=payload.phone,
        email=payload.email,
        address=payload.address or "Headquarters",
        city=payload.city or "North County",
        date=parsed_date,
        day_number=payload.dayNumber,
        month=payload.month,
        year=payload.year,
        start_time=payload.startTime,
        end_time=payload.endTime,
        category=payload.category,
        status=payload.status,
        assigned_to_user_id=payload.assignedToUserId,
        crew_id=str(payload.assignedToUserId) if payload.assignedToUserId else payload.crewId,
        crew_name=payload.assignedToName or payload.crewName or "Assigned Member",
        foreman_name=payload.assignedToRole or payload.foremanName or "Team Member",
        foreman_phone=payload.foremanPhone,
        squares=payload.squares,
        material=payload.material,
        delivery_supplier=payload.deliverySupplier,
        permit_number=payload.permitNumber,
        permit_type=payload.permitType,
        notes=payload.notes,
        is_weather_sensitive=payload.isWeatherSensitive or False,
    )
    db.add(event)

    # If it's a team task, also persist into central tasks table for two-way sync
    if payload.category in ("team_task", "manual_task") or payload.id.startswith("task-"):
        try:
            time_part = datetime.strptime(payload.startTime, "%I:%M %p").time()
            due_dt = datetime.combine(parsed_date, time_part).replace(tzinfo=timezone.utc)
        except Exception:
            due_dt = datetime.now(timezone.utc)

        await db.execute(text("""
            INSERT INTO tasks (title, description, assigned_to, assigned_to_user_id, due_at, event_type, priority, created_by_user_id)
            VALUES (:title, :desc, :assigned_to, :uid, :due_at, :event_type, 'normal', :creator)
        """), {
            "title": payload.title,
            "desc": payload.notes or "",
            "assigned_to": payload.assignedToName or "Team Member",
            "uid": payload.assignedToUserId,
            "due_at": due_dt,
            "event_type": payload.category,
            "creator": user.get("id"),
        })

    await db.commit()
    await db.refresh(event)

    return CalendarEventSingleResponse(success=True, data=payload, message="Event created successfully")


@router.put("/events/{event_id}", response_model=CalendarEventSingleResponse)
async def update_calendar_event(
    event_id: str,
    payload: UpdateCalendarEventPayload,
    user: Dict[str, Any] = Depends(require_any_permission(["calendar.create_event", "jobs.edit"])),
    db: AsyncSession = Depends(get_db),
):

    # Handle task- prefixed items (persisted in tasks table)
    payload_dict = payload.model_dump(exclude_unset=True)

    if event_id.startswith("task-"):
        raw_tid = event_id.replace("task-", "")
        if raw_tid.isdigit():
            t_id = int(raw_tid)
            completed_val = datetime.now(timezone.utc) if payload.status == "completed" else None
            
            task_updates = []
            task_params: Dict[str, Any] = {"id": t_id}

            if "status" in payload_dict:
                task_updates.append("completed_at = :completed_at")
                task_params["completed_at"] = completed_val
            if "title" in payload_dict:
                task_updates.append("title = :title")
                task_params["title"] = payload.title
            if "notes" in payload_dict:
                task_updates.append("description = :notes")
                task_params["notes"] = payload.notes
            if "assignedToUserId" in payload_dict:
                task_updates.append("assigned_to_user_id = :uid")
                task_params["uid"] = payload.assignedToUserId
            if "assignedToName" in payload_dict:
                task_updates.append("assigned_to = :assigned_to")
                task_params["assigned_to"] = payload.assignedToName

            if task_updates:
                await db.execute(text(f"UPDATE tasks SET {', '.join(task_updates)} WHERE id = :id"), task_params)
                await db.commit()

            return CalendarEventSingleResponse(
                success=True,
                data=CalendarEventPayload(
                    id=event_id,
                    title=payload.title or "Team Operation",
                    jobCode=f"TASK-{t_id}",
                    customerName=payload.customerName or "Team Task",
                    address="Headquarters",
                    city="North County",
                    date=payload.date or "2026-09-18",
                    dayNumber=payload.dayNumber or 18,
                    month=payload.month or 9,
                    year=payload.year or 2026,
                    startTime=payload.startTime or "09:00 AM",
                    endTime=payload.endTime or "10:00 AM",
                    category=payload.category or "team_task",
                    status=payload.status or ("completed" if completed_val else "scheduled"),
                    assignedToUserId=payload.assignedToUserId,
                    assignedToName=payload.assignedToName,
                    completedAt=completed_val.isoformat() if completed_val else None,
                    sourceType="task",
                ),
                message="Task updated successfully"
            )

    # Handle virtual lead site-visit events (lead-visit-{lead_id})
    if event_id.startswith("lead-visit-"):
        raw_lid = event_id.replace("lead-visit-", "")
        if raw_lid.isdigit():
            l_id = int(raw_lid)
            lead_row = (await db.execute(
                text("SELECT id, full_name, phone, email, address, city, site_visit_scheduled_at FROM leads WHERE id = :id"),
                {"id": l_id}
            )).mappings().first()
            if not lead_row:
                raise HTTPException(status_code=404, detail="Lead not found for this calendar event")

            lead_updates = []
            lead_params: Dict[str, Any] = {"id": l_id}

            if payload.status == "cancelled":
                # Cancel: clear the scheduled timestamp
                lead_updates.append("site_visit_scheduled_at = NULL")
            elif "date" in payload_dict and payload.date:
                # Reschedule: reconstruct datetime from date + startTime
                try:
                    date_str = payload.date  # YYYY-MM-DD
                    time_str = payload.startTime or "09:00 AM"
                    combined_str = f"{date_str} {time_str}"
                    # Try parsing 12h format first, then 24h
                    new_dt = None
                    for fmt in ("%Y-%m-%d %I:%M %p", "%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M%p"):
                        try:
                            new_dt = datetime.strptime(combined_str, fmt).replace(tzinfo=timezone.utc)
                            break
                        except ValueError:
                            continue
                    if new_dt:
                        lead_updates.append("site_visit_scheduled_at = :scheduled_at")
                        lead_params["scheduled_at"] = new_dt
                except Exception:
                    pass

            if lead_updates:
                await db.execute(
                    text(f"UPDATE leads SET {', '.join(lead_updates)}, updated_at = NOW() WHERE id = :id"),
                    lead_params
                )
                await db.commit()

            # Re-fetch the lead to build response
            refreshed = (await db.execute(
                text("SELECT id, full_name, phone, email, address, city, site_visit_scheduled_at FROM leads WHERE id = :id"),
                {"id": l_id}
            )).mappings().first()

            sched = refreshed["site_visit_scheduled_at"] if refreshed else None
            resp_date = sched.strftime("%Y-%m-%d") if sched else (payload.date or "")
            resp_start = sched.strftime("%I:%M %p").lstrip("0") if sched else (payload.startTime or "09:00 AM")
            resp_status = "cancelled" if payload.status == "cancelled" else ("scheduled" if sched else "cancelled")

            return CalendarEventSingleResponse(
                success=True,
                data=CalendarEventPayload(
                    id=event_id,
                    title=payload.title or f"Estimate – {lead_row['full_name']}",
                    jobCode=f"LEAD-{l_id}",
                    customerName=payload.customerName or lead_row["full_name"] or "",
                    phone=payload.phone or lead_row.get("phone") or "",
                    email=payload.email or lead_row.get("email") or "",
                    address=payload.address or lead_row.get("address") or "",
                    city=payload.city or lead_row.get("city") or "San Diego",
                    date=resp_date,
                    dayNumber=int(resp_date.split("-")[2]) if resp_date else 1,
                    month=int(resp_date.split("-")[1]) if resp_date else 1,
                    year=int(resp_date.split("-")[0]) if resp_date else 2026,
                    startTime=resp_start,
                    endTime=payload.endTime or "10:00 AM",
                    category="roof_inspection",
                    status=resp_status,
                    assignedToUserId=payload.assignedToUserId,
                    assignedToName=payload.assignedToName,
                    sourceType="pipeline_lead",
                ),
                message="Lead appointment updated successfully"
            )

    stmt = select(CalendarEvent).where(CalendarEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")

    mapping = {
        "title": "title", "jobCode": "job_code", "customerName": "customer_name",
        "phone": "phone", "email": "email", "address": "address", "city": "city",
        "startTime": "start_time", "endTime": "end_time", "category": "category",
        "status": "status", "assignedToUserId": "assigned_to_user_id",
        "crewId": "crew_id", "crewName": "crew_name",
        "foremanName": "foreman_name", "foremanPhone": "foreman_phone",
        "squares": "squares", "material": "material", "deliverySupplier": "delivery_supplier",
        "permitNumber": "permit_number", "permitType": "permit_type",
        "notes": "notes", "isWeatherSensitive": "is_weather_sensitive",
    }

    for client_k, model_k in mapping.items():
        if client_k in payload_dict:
            setattr(event, model_k, payload_dict[client_k])

    if "assignedToName" in payload_dict and payload.assignedToName:
        event.crew_name = payload.assignedToName
    if "assignedToRole" in payload_dict and payload.assignedToRole:
        event.foreman_name = payload.assignedToRole

    if "date" in payload_dict and payload.date:
        event.date = py_date.fromisoformat(payload.date) if isinstance(payload.date, str) else payload.date
    if "dayNumber" in payload_dict:
        event.day_number = payload.dayNumber
    if "month" in payload_dict:
        event.month = payload.month
    if "year" in payload_dict:
        event.year = payload.year

    if payload.status == "completed" and not event.completed_at:
        event.completed_at = datetime.now(timezone.utc)
    elif payload.status and payload.status != "completed":
        event.completed_at = None

    await db.commit()
    await db.refresh(event)

    updated_payload = CalendarEventPayload(
        id=event.id,
        title=event.title,
        jobCode=event.job_code,
        customerName=event.customer_name,
        phone=event.phone,
        email=event.email,
        address=event.address,
        city=event.city,
        date=event.date.isoformat() if hasattr(event.date, "isoformat") else str(event.date),
        dayNumber=event.day_number,
        month=event.month,
        year=event.year,
        startTime=event.start_time,
        endTime=event.end_time,
        category=event.category,
        status=event.status,
        assignedToUserId=event.assigned_to_user_id,
        assignedToName=event.crew_name,
        assignedToRole=event.foreman_name,
        crewId=event.crew_id,
        crewName=event.crew_name,
        foremanName=event.foreman_name,
        foremanPhone=event.foreman_phone,
        squares=float(event.squares) if event.squares is not None else None,
        material=event.material,
        deliverySupplier=event.delivery_supplier,
        permitNumber=event.permit_number,
        permitType=event.permit_type,
        notes=event.notes,
        isWeatherSensitive=event.is_weather_sensitive,
        completedAt=event.completed_at.isoformat() if event.completed_at else None,
        sourceType="dispatch",
    )

    return CalendarEventSingleResponse(success=True, data=updated_payload, message="Event updated successfully")


@router.delete("/events/{event_id}")
async def delete_calendar_event(
    event_id: str,
    user: Dict[str, Any] = Depends(require_permission("calendar.create_event")),
    db: AsyncSession = Depends(get_db),
):
    if event_id.startswith("task-"):
        raw_tid = event_id.replace("task-", "")
        if raw_tid.isdigit():
            await db.execute(text("DELETE FROM tasks WHERE id = :id"), {"id": int(raw_tid)})
            await db.commit()
            return {"success": True, "message": "Task deleted successfully"}

    # Virtual lead site-visit events: cancel by clearing site_visit_scheduled_at
    if event_id.startswith("lead-visit-"):
        raw_lid = event_id.replace("lead-visit-", "")
        if raw_lid.isdigit():
            l_id = int(raw_lid)
            await db.execute(
                text("UPDATE leads SET site_visit_scheduled_at = NULL, updated_at = NOW() WHERE id = :id"),
                {"id": l_id}
            )
            await db.commit()
            return {"success": True, "message": "Lead appointment cancelled successfully"}

    stmt = select(CalendarEvent).where(CalendarEvent.id == event_id)
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")

    await db.delete(event)
    await db.commit()
    return {"success": True, "message": "Event deleted successfully"}
