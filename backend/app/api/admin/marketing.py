from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
import secrets
import re
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.permissions import (
    require_permission, require_any_permission, require_auth_user,
    has_permission, get_permission_scope
)
from app.services.sla import get_needs_follow_up_sql_condition
from pydantic import BaseModel, Field

class CreateReviewRequestPayload(BaseModel):
    customerName: str = Field(..., min_length=1)
    leadId: Optional[int] = None
    jobId: Optional[int] = None
    customerCity: Optional[str] = "San Diego"
    initialRating: Optional[int] = 5
    serviceType: Optional[str] = "Roof Replacement"
    source: Optional[str] = "sms_request"

class UpdateReviewPayload(BaseModel):
    id: int
    status: Optional[str] = None
    feedback: Optional[str] = None

router = APIRouter()

# ── WEB ANALYTICS ────────────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    request: Request,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    days: Optional[int] = Query(None, ge=1, le=1100),
    hours: Optional[int] = Query(None, ge=1, le=168),
    timeframe: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission(["analytics:view", "reports:view", "reports.view"])),
    db: AsyncSession = Depends(get_db)
):
    # Parse timeframe shorthand if provided
    tf = (timeframe or "").strip().lower()
    if tf == "2h":
        hours = 2
        days = None
    elif tf == "24h" or tf == "today":
        hours = 24
        days = None
    elif tf == "7d":
        days = 7
        hours = None
    elif tf == "30d":
        days = 30
        hours = None
    elif tf == "90d":
        days = 90
        hours = None
    elif tf == "ytd":
        now_dt = datetime.now(timezone.utc)
        start_of_year = datetime(now_dt.year, 1, 1, tzinfo=timezone.utc)
        days = max(1, (now_dt - start_of_year).days)
        hours = None
    elif tf in ("365d", "1y", "year"):
        days = 365
        hours = None
    elif tf in ("730d", "2y", "2years"):
        days = 730
        hours = None

    date_regex = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    is_hourly = False
    is_monthly = False

    time_params: dict = {}
    valid_custom_dates = False
    
    if from_date and to_date and date_regex.match(from_date.strip()) and date_regex.match(to_date.strip()):
        try:
            parsed_from = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            parsed_to = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            time_params = {"from_dt": parsed_from, "to_dt": parsed_to}
            valid_custom_dates = True
            if (parsed_to - parsed_from).days > 180:
                is_monthly = True
        except ValueError:
            valid_custom_dates = False

    if not valid_custom_dates:
        now = datetime.now(timezone.utc)
        if hours:
            time_params = {"from_dt": now - timedelta(hours=int(hours)), "to_dt": now}
            is_hourly = True
        else:
            num_days = int(days) if days is not None else 30
            time_params = {"from_dt": now - timedelta(days=num_days), "to_dt": now}
            if num_days > 180:
                is_monthly = True

    from_expr = ":from_dt"
    to_expr = ":to_dt"

    leads_time_filter = f"created_at >= {from_expr} AND created_at < {to_expr}"
    localhost_clause = (
        "(referrer NOT ILIKE '%localhost%' AND referrer NOT ILIKE '%127.0.0.1%' AND referrer NOT ILIKE '%0.0.0.0%' OR referrer IS NULL) "
        "AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%') "
        "AND page_path NOT LIKE '/admin%'"
    )
    time_filter = f"created_at >= {from_expr} AND created_at < {to_expr} AND {localhost_clause}"
    pv_filter = f"event_type = 'pageview' AND {time_filter}"

    # Adaptive timeline query: hourly for short spans, daily for standard, monthly for multi-year
    if is_hourly:
        timeline_q = text(f"""
            SELECT TO_CHAR(DATE_TRUNC('hour', created_at), 'YYYY-MM-DD HH24:00') AS day,
                   TO_CHAR(DATE_TRUNC('hour', created_at), 'HH12 AM') AS label,
                   COUNT(*) AS pageviews,
                   COUNT(DISTINCT session_id) AS sessions
            FROM analytics_events
            WHERE {pv_filter}
            GROUP BY DATE_TRUNC('hour', created_at)
            ORDER BY DATE_TRUNC('hour', created_at)
        """)
    elif is_monthly:
        timeline_q = text(f"""
            SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS day,
                   TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS label,
                   COUNT(*) AS pageviews,
                   COUNT(DISTINCT session_id) AS sessions
            FROM analytics_events
            WHERE {pv_filter}
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        """)
    else:
        timeline_q = text(f"""
            SELECT DATE_TRUNC('day', created_at)::DATE::TEXT AS day,
                   TO_CHAR(DATE_TRUNC('day', created_at)::DATE, 'Mon DD') AS label,
                   COUNT(*) AS pageviews,
                   COUNT(DISTINCT session_id) AS sessions
            FROM analytics_events
            WHERE {pv_filter}
            GROUP BY DATE_TRUNC('day', created_at)::DATE
            ORDER BY DATE_TRUNC('day', created_at)::DATE
        """)

    top_pages_q = text(f"""
        SELECT page_path,
               COUNT(*) AS views,
               COUNT(DISTINCT session_id) AS sessions
        FROM analytics_events
        WHERE {pv_filter}
        GROUP BY page_path
        ORDER BY views DESC LIMIT 15
    """)

    device_q = text(f"""
        SELECT device_type, COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter}
        GROUP BY device_type
    """)

    referrers_q = text(f"""
        SELECT COALESCE(NULLIF(TRIM(referrer), ''), 'Direct / Bookmark') AS referrer,
               COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter}
          AND referrer NOT ILIKE '%localhost%'
          AND referrer NOT ILIKE '%127.0.0.1%'
        GROUP BY COALESCE(NULLIF(TRIM(referrer), ''), 'Direct / Bookmark')
        ORDER BY count DESC LIMIT 10
    """)

    countries_q = text(f"""
        SELECT country, COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter} AND country IS NOT NULL AND TRIM(country) != ''
        GROUP BY country
        ORDER BY count DESC LIMIT 10
    """)

    cities_q = text(f"""
        SELECT TRIM(city) AS city,
               COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter} AND city IS NOT NULL AND TRIM(city) != ''
        GROUP BY TRIM(city)
        ORDER BY count DESC LIMIT 10
    """)

    hourly_q = text(f"""
        SELECT EXTRACT(HOUR FROM created_at)::INT AS hour,
               COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter}
        GROUP BY EXTRACT(HOUR FROM created_at)::INT
        ORDER BY EXTRACT(HOUR FROM created_at)::INT
    """)

    weekday_q = text(f"""
        SELECT EXTRACT(DOW FROM created_at)::INT AS dow,
               TO_CHAR(created_at, 'Dy') AS label,
               COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter}
        GROUP BY EXTRACT(DOW FROM created_at)::INT, TO_CHAR(created_at, 'Dy')
        ORDER BY EXTRACT(DOW FROM created_at)::INT
    """)

    event_type_q = text(f"""
        SELECT event_type, COUNT(*) AS count
        FROM analytics_events
        WHERE {time_filter}
        GROUP BY event_type
        ORDER BY count DESC
    """)

    top_buttons_q = text(f"""
        SELECT COALESCE(label, element, 'Button') AS label,
               COUNT(*) AS count
        FROM analytics_events
        WHERE event_type IN ('button_click', 'nav_click', 'cta_click', 'call') AND {time_filter}
          AND COALESCE(label, element) IS NOT NULL
        GROUP BY COALESCE(label, element, 'Button')
        ORDER BY count DESC LIMIT 12
    """)

    activity_feed_q = text(f"""
        SELECT id, session_id, event_type, page_path, label, element,
               device_type, country, city, scroll_pct, duration_ms,
               utm_source, utm_medium, created_at
        FROM activity_log
        WHERE created_at >= {from_expr} AND created_at < {to_expr}
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        ORDER BY created_at DESC LIMIT 80
    """)

    session_stats_q = text(f"""
        SELECT COUNT(DISTINCT session_id) AS total_sessions,
               COUNT(DISTINCT CASE WHEN pv_count = 1 THEN session_id END) AS bounce_sessions,
               ROUND(AVG(max_scroll)) AS avg_scroll,
               ROUND(AVG(duration_ms)) AS avg_duration_ms
        FROM (
          SELECT session_id,
                 COUNT(CASE WHEN event_type='pageview' THEN 1 END) AS pv_count,
                 MAX(CASE WHEN event_type='scroll' THEN scroll_pct ELSE 0 END) AS max_scroll,
                 MAX(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE 0 END) AS duration_ms
          FROM analytics_events
          WHERE {time_filter}
          GROUP BY session_id
        ) s
    """)

    calls_q = text(f"""
        SELECT EXTRACT(HOUR FROM created_at)::INT AS hour,
               COUNT(*) AS count
        FROM call_events
        WHERE created_at >= {from_expr} AND created_at < {to_expr}
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY EXTRACT(HOUR FROM created_at)::INT
        ORDER BY EXTRACT(HOUR FROM created_at)::INT
    """)

    calls_total_q = text(f"""
        SELECT COUNT(*) AS count
        FROM call_events
        WHERE created_at >= {from_expr} AND created_at < {to_expr}
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
    """)

    calls_by_page_q = text(f"""
        SELECT COALESCE(page_path, '/') AS page_path, COUNT(*) AS count
        FROM call_events
        WHERE created_at >= {from_expr} AND created_at < {to_expr}
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY page_path ORDER BY count DESC LIMIT 6
    """)

    utm_q = text(f"""
        SELECT 
            CASE 
                WHEN utm_source IS NOT NULL AND TRIM(utm_source) != '' THEN LOWER(TRIM(utm_source))
                WHEN referrer ILIKE '%google.%' THEN 'google'
                WHEN referrer ILIKE '%yelp.%' THEN 'yelp'
                WHEN referrer ILIKE '%facebook.%' OR referrer ILIKE '%instagram.%' OR referrer ILIKE '%t.co%' THEN 'social'
                WHEN referrer ILIKE '%vercel.%' THEN 'vercel'
                WHEN referrer ILIKE '%clickup.%' THEN 'clickup'
                WHEN referrer IS NULL OR TRIM(referrer) = '' THEN 'direct'
                ELSE 'referral'
            END AS utm_source,
            COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE {pv_filter}
        GROUP BY 1
        ORDER BY count DESC LIMIT 8
    """)

    total_pv_q = text(f"SELECT COUNT(*) AS count FROM analytics_events WHERE {pv_filter}")
    unique_visitors_q = text(f"SELECT COUNT(DISTINCT session_id) AS count FROM analytics_events WHERE {pv_filter}")
    leads_q = text(f"SELECT COUNT(*) AS count FROM leads WHERE {leads_time_filter}")
    website_leads_q = text(f"SELECT COUNT(*) AS count FROM leads WHERE (source_type = 'website' OR lead_source LIKE 'website%') AND {leads_time_filter}")

    daily_pv = [dict(r._mapping) for r in (await db.execute(timeline_q, time_params)).fetchall()]
    top_pages = [dict(r._mapping) for r in (await db.execute(top_pages_q, time_params)).fetchall()]
    devices = [dict(r._mapping) for r in (await db.execute(device_q, time_params)).fetchall()]
    referrers = [dict(r._mapping) for r in (await db.execute(referrers_q, time_params)).fetchall()]
    countries = [dict(r._mapping) for r in (await db.execute(countries_q, time_params)).fetchall()]
    cities = [dict(r._mapping) for r in (await db.execute(cities_q, time_params)).fetchall()]
    hourly = [dict(r._mapping) for r in (await db.execute(hourly_q, time_params)).fetchall()]
    weekdays = [dict(r._mapping) for r in (await db.execute(weekday_q, time_params)).fetchall()]
    event_types = [dict(r._mapping) for r in (await db.execute(event_type_q, time_params)).fetchall()]
    top_buttons = [dict(r._mapping) for r in (await db.execute(top_buttons_q, time_params)).fetchall()]

    try:
        activity_feed = [dict(r._mapping) for r in (await db.execute(activity_feed_q, time_params)).fetchall()]
    except Exception:
        activity_feed = []

    s_res = await db.execute(session_stats_q, time_params)
    s_stats = s_res.first()

    calls = [dict(r._mapping) for r in (await db.execute(calls_q, time_params)).fetchall()]
    calls_by_page = [dict(r._mapping) for r in (await db.execute(calls_by_page_q, time_params)).fetchall()]
    total_calls_res = await db.execute(calls_total_q, time_params)
    total_calls = int(total_calls_res.scalar() or 0)

    utms = [dict(r._mapping) for r in (await db.execute(utm_q, time_params)).fetchall()]

    l_res = await db.execute(leads_q, time_params)
    leads_count = int(l_res.scalar() or 0)

    wl_res = await db.execute(website_leads_q, time_params)
    website_leads_count = int(wl_res.scalar() or 0)

    tpv_res = await db.execute(total_pv_q, time_params)
    total_pageviews = int(tpv_res.scalar() or 0)

    uv_res = await db.execute(unique_visitors_q, time_params)
    unique_visitors = int(uv_res.scalar() or 0)

    total_sessions = int(s_stats.total_sessions or 0) if s_stats else 0
    bounce_sessions = int(s_stats.bounce_sessions or 0) if s_stats else 0
    avg_scroll = int(s_stats.avg_scroll or 0) if s_stats else 0
    avg_duration_ms = int(s_stats.avg_duration_ms or 0) if s_stats else 0
    bounce_rate = round((bounce_sessions / total_sessions) * 100) if total_sessions > 0 else 0
    conversion_rate = round((website_leads_count / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
    call_conversion_rate = round((total_calls / total_sessions) * 100, 1) if total_sessions > 0 else 0.0

    return {
        "dailyPageviews": daily_pv,
        "timeline": daily_pv,
        "isHourly": is_hourly,
        "isMonthly": is_monthly,
        "topPages": top_pages,
        "deviceBreakdown": devices,
        "referrers": referrers,
        "countries": countries,
        "cities": cities,
        "hourlyHeatmap": hourly,
        "weekdayTraffic": weekdays,
        "eventTypeBreakdown": event_types,
        "topButtons": top_buttons,
        "activityFeed": activity_feed,
        "utmSources": utms,
        "callsByHour": calls,
        "callsByPage": calls_by_page,
        "totalCalls": total_calls,
        "bounceRate": bounce_rate,
        "avgScrollDepth": avg_scroll,
        "avgDurationMs": avg_duration_ms,
        "conversionRate": conversion_rate,
        "callConversionRate": call_conversion_rate,
        "totalSessions": total_sessions,
        "totalPageviews": total_pageviews,
        "uniqueVisitors": unique_visitors,
        "websiteLeadsCount": website_leads_count,
        "allLeadsCount": leads_count,
    }

# ── HEATMAP ──────────────────────────────────────────────────────────────────

@router.get("/heatmap")
async def get_heatmap(
    page: str = Query("/", alias="page"),
    days: int = Query(30, ge=1, le=365),
    user: Dict[str, Any] = Depends(require_any_permission(["analytics:view", "reports:view", "reports.view"])),
    db: AsyncSession = Depends(get_db)
):
    pages_res = await db.execute(text("""
        SELECT page_path, COUNT(*) AS views
        FROM analytics_events
        WHERE event_type = 'pageview' AND page_path NOT LIKE '/admin%'
          AND (referrer NOT ILIKE '%localhost%' AND referrer NOT ILIKE '%127.0.0.1%' OR referrer IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY page_path ORDER BY views DESC
    """))
    pages = [dict(r._mapping) for r in pages_res.fetchall()]

    if page.startswith("/admin") or "localhost" in page.lower():
        return {"clicks": [], "scrollDepth": [], "topElements": [], "pages": pages}

    clicks_res = await db.execute(text(f"""
        SELECT x_pct, y_pct, COUNT(*) AS count
        FROM analytics_events
        WHERE event_type = 'click'
          AND page_path = :path
          AND x_pct IS NOT NULL
          AND y_pct IS NOT NULL
          AND (referrer NOT ILIKE '%localhost%' AND referrer NOT ILIKE '%127.0.0.1%' OR referrer IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
          AND created_at >= NOW() - INTERVAL '{days} days'
        GROUP BY x_pct, y_pct
    """), {"path": page})
    clicks = [dict(r._mapping) for r in clicks_res.fetchall()]

    scroll_res = await db.execute(text(f"""
        SELECT FLOOR(scroll_pct / 10) * 10 AS bucket, COUNT(DISTINCT session_id) AS count
        FROM analytics_events
        WHERE event_type = 'scroll'
          AND page_path = :path
          AND scroll_pct IS NOT NULL
          AND (referrer NOT ILIKE '%localhost%' AND referrer NOT ILIKE '%127.0.0.1%' OR referrer IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
          AND created_at >= NOW() - INTERVAL '{days} days'
        GROUP BY bucket ORDER BY bucket
    """), {"path": page})
    scroll_depth = [dict(r._mapping) for r in scroll_res.fetchall()]

    elements_res = await db.execute(text(f"""
        SELECT element, COUNT(*) AS count
        FROM analytics_events
        WHERE event_type = 'click'
          AND page_path = :path
          AND element IS NOT NULL
          AND (referrer NOT ILIKE '%localhost%' AND referrer NOT ILIKE '%127.0.0.1%' OR referrer IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
          AND created_at >= NOW() - INTERVAL '{days} days'
        GROUP BY element ORDER BY count DESC LIMIT 10
    """), {"path": page})
    top_elements = [dict(r._mapping) for r in elements_res.fetchall()]

    return {"clicks": clicks, "scrollDepth": scroll_depth, "topElements": top_elements, "pages": pages}

# ── CALL TRACKING ────────────────────────────────────────────────────────────

@router.get("/calls")
async def get_calls(
    days: int = Query(30, ge=1, le=365),
    user: Dict[str, Any] = Depends(require_any_permission(["analytics:view", "reports:view", "reports.view"])),
    db: AsyncSession = Depends(get_db)
):
    daily_res = await db.execute(text(f"""
        SELECT DATE_TRUNC('day', created_at)::DATE AS day, COUNT(*) AS count
        FROM call_events
        WHERE created_at >= NOW() - INTERVAL '{days} days'
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY day ORDER BY day
    """))
    daily = [dict(r._mapping) for r in daily_res.fetchall()]

    by_page_res = await db.execute(text(f"""
        SELECT page_path, COUNT(*) AS count
        FROM call_events
        WHERE created_at >= NOW() - INTERVAL '{days} days'
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY page_path ORDER BY count DESC LIMIT 8
    """))
    by_page = [dict(r._mapping) for r in by_page_res.fetchall()]

    by_dev_res = await db.execute(text(f"""
        SELECT device_type, COUNT(*) AS count
        FROM call_events
        WHERE created_at >= NOW() - INTERVAL '{days} days'
          AND (page_path NOT LIKE '/admin%' OR page_path IS NULL)
          AND (page_path NOT ILIKE '%localhost%' AND page_path NOT ILIKE '%127.0.0.1%')
        GROUP BY device_type
    """))
    by_dev = [dict(r._mapping) for r in by_dev_res.fetchall()]

    recent_res = await db.execute(text(f"""
        SELECT * FROM call_events
        WHERE (page_path NOT LIKE '/admin%' OR page_path IS NULL)
        ORDER BY created_at DESC LIMIT 20
    """))
    recent = [dict(r._mapping) for r in recent_res.fetchall()]

    return {"daily": daily, "byPage": by_page, "byDevice": by_dev, "recent": recent}

# ── EXECUTIVE STATS & KPI STRIP ──────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    user: Dict[str, Any] = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db)
):
    leads_scope = get_permission_scope(user, "leads.view")
    jobs_scope = get_permission_scope(user, "jobs.view")
    estimates_scope = get_permission_scope(user, "estimates.view")
    can_view_profit = has_permission(user, "finances.view") or has_permission(user, "finances:view_profit_ledger")
    can_view_reports = has_permission(user, "reports.view")
    can_view_analytics = has_permission(user, "analytics.view")

    follow_up_threshold_hours = 72
    try:
        s_res = await db.execute(text("SELECT value FROM app_settings WHERE key = 'follow_up_threshold_hours' LIMIT 1"))
        s_row = s_res.first()
        if s_row and s_row[0]:
            follow_up_threshold_hours = int(s_row[0])
    except Exception:
        pass

    uid = int(user["id"])
    lead_filter = ""
    if leads_scope == "own":
        lead_filter = f"AND (l.created_by = {uid} OR l.created_by_user_id = {uid})"
    elif leads_scope == "assigned":
        lead_filter = f"AND l.assigned_to_user_id = {uid}"

    job_filter = ""
    if jobs_scope == "own":
        job_filter = f"AND (j.created_by = {uid} OR j.lead_id IN (SELECT id FROM leads WHERE created_by = {uid} OR created_by_user_id = {uid}))"
    elif jobs_scope == "assigned":
        job_filter = f"AND (j.lead_id IN (SELECT id FROM leads WHERE assigned_to_user_id = {uid}))"

    est_filter = ""
    if estimates_scope == "own":
        est_filter = f"AND (created_by = {uid} OR lead_id IN (SELECT id FROM leads WHERE created_by = {uid} OR created_by_user_id = {uid}))"
    elif estimates_scope == "assigned":
        est_filter = f"AND (lead_id IN (SELECT id FROM leads WHERE assigned_to_user_id = {uid}))"

    # KPI query
    kpi_sql = f"""
        WITH
          agg_leads AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          agg_connected AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' AND (l.pipeline_stage != 'stage_1_lead_gen' OR l.last_contact_at IS NOT NULL) {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          agg_scheduled AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' AND l.pipeline_stage = 'stage_3_site_visit_estimate' {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          agg_est_sent AS ({f"SELECT COUNT(*) as count FROM estimates WHERE 1=1 {est_filter}" if estimates_scope else "SELECT 0 as count"}),
          agg_jobs_won AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status = 'won' {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          agg_lost AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status = 'lost' {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          agg_jobs AS ({f"SELECT COUNT(*) as count FROM jobs j WHERE j.status != 'complete' {job_filter}" if jobs_scope else "SELECT 0 as count"}),
          agg_revenue AS ({f"SELECT COALESCE(SUM(amount), 0) as amount FROM invoices WHERE status = 'paid' AND (paid_at >= date_trunc('month', NOW()) OR (paid_at IS NULL AND updated_at >= date_trunc('month', NOW())))" if can_view_profit else "SELECT 0 as amount"}),
          prev_month_start AS (SELECT date_trunc('month', NOW()) - INTERVAL '1 month' AS d),
          prev_month_end AS (SELECT date_trunc('month', NOW()) AS d),
          prev_leads AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' AND l.created_at >= (SELECT d FROM prev_month_start) AND l.created_at < (SELECT d FROM prev_month_end) {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          prev_connected AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' AND (l.pipeline_stage != 'stage_1_lead_gen' OR l.last_contact_at IS NOT NULL) AND l.last_contact_at >= (SELECT d FROM prev_month_start) AND l.last_contact_at < (SELECT d FROM prev_month_end) {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          prev_scheduled AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status != 'lost' AND l.pipeline_stage = 'stage_3_site_visit_estimate' AND l.stage_entered_at >= (SELECT d FROM prev_month_start) AND l.stage_entered_at < (SELECT d FROM prev_month_end) {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          prev_est AS ({f"SELECT COUNT(*) as count FROM estimates WHERE created_at >= (SELECT d FROM prev_month_start) AND created_at < (SELECT d FROM prev_month_end) {est_filter}" if estimates_scope else "SELECT 0 as count"}),
          prev_won AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status = 'won' AND l.updated_at >= (SELECT d FROM prev_month_start) AND l.updated_at < (SELECT d FROM prev_month_end) {lead_filter}" if leads_scope else "SELECT 0 as count"}),
          prev_lost AS ({f"SELECT COUNT(*) as count FROM leads l WHERE l.status = 'lost' AND l.updated_at >= (SELECT d FROM prev_month_start) AND l.updated_at < (SELECT d FROM prev_month_end) {lead_filter}" if leads_scope else "SELECT 0 as count"})
        SELECT
          (SELECT count FROM agg_leads) as new_leads,
          (SELECT count FROM agg_connected) as connected_leads,
          (SELECT count FROM agg_scheduled) as est_scheduled,
          (SELECT count FROM agg_est_sent) as est_sent,
          (SELECT count FROM agg_jobs_won) as jobs_won,
          (SELECT count FROM agg_lost) as lost_closed,
          (SELECT count FROM agg_jobs) as active_jobs,
          (SELECT amount FROM agg_revenue) as revenue_mtd,
          (SELECT count FROM prev_leads) as prev_new_leads,
          (SELECT count FROM prev_connected) as prev_connected,
          (SELECT count FROM prev_scheduled) as prev_scheduled,
          (SELECT count FROM prev_est) as prev_est_sent,
          (SELECT count FROM prev_won) as prev_jobs_won,
          (SELECT count FROM prev_lost) as prev_lost_closed
    """
    kpi_res = await db.execute(text(kpi_sql))
    kpi_row = kpi_res.first()

    # Needs follow up
    needs_follow_up = []
    if leads_scope:
        n_sql = f"""
            SELECT 
              l.id, l.full_name, l.phone, l.email, l.address, COALESCE(l.city, 'San Diego') as city, 
              l.service_type, l.estimated_value, l.pipeline_stage, l.status, l.priority, 
              l.assigned_to as assigned_to_name, l.assigned_to_user_id,
              COALESCE(l.proposal_sent_at, l.last_contact_at, l.stage_entered_at, l.created_at) as last_activity_at,
              ROUND(EXTRACT(EPOCH FROM (NOW() - COALESCE(l.proposal_sent_at, l.last_contact_at, l.stage_entered_at, l.created_at))) / 86400)::int as days_idle
            FROM leads l
            WHERE l.status NOT IN ('won', 'lost')
              AND {get_needs_follow_up_sql_condition(1)}
              {lead_filter}
            ORDER BY COALESCE(l.proposal_sent_at, l.last_contact_at, l.stage_entered_at, l.created_at) ASC
            LIMIT 6
        """
        n_res = await db.execute(text(n_sql), {"threshold_hours": follow_up_threshold_hours})
        needs_follow_up = [dict(r._mapping) for r in n_res.fetchall()]

    # Tasks
    tasks_res = await db.execute(text("""
        SELECT 
          t.id, t.title, t.description, t.priority, t.work_category, t.due_at, t.end_at, t.completed_at,
          t.entity_type, t.entity_id,
          COALESCE(l.full_name, j.customer_name) as related_name,
          COALESCE(l.phone, j.customer_phone) as related_phone
        FROM tasks t
        LEFT JOIN leads l ON t.entity_type = 'lead' AND t.entity_id = l.id
        LEFT JOIN jobs j ON t.entity_type = 'job' AND t.entity_id = j.id
        WHERE (t.assigned_to_user_id = :uid OR t.created_by_user_id = :uid)
          AND (t.completed_at IS NULL OR t.completed_at >= CURRENT_DATE)
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
        LIMIT 25
    """), {"uid": uid})
    my_tasks = [dict(r._mapping) for r in tasks_res.fetchall()]

    # Active jobs
    active_jobs = []
    if jobs_scope:
        j_res = await db.execute(text(f"""
            SELECT 
              j.id, j.job_number, j.customer_name, j.customer_phone, j.address, 
              COALESCE(j.city, 'San Diego') as city, j.service_type, j.status, 
              j.crew_lead, j.contract_value, j.scheduled_start, j.lead_id
            FROM jobs j
            WHERE j.status IN ('scheduled', 'in_progress', 'material_order', 'permit_pending', 'punch_list', 'final_inspection')
            {job_filter}
            ORDER BY j.updated_at DESC
            LIMIT 6
        """))
        active_jobs = [dict(r._mapping) for r in j_res.fetchall()]

    # Recent leads
    recent_leads = []
    if leads_scope:
        rl_res = await db.execute(text(f"""
            SELECT 
              l.id, l.full_name, l.phone, l.email, l.address, COALESCE(l.city, 'San Diego') as city, 
              l.service_type, l.status, l.priority, l.lead_score, l.estimated_value, l.created_at,
              l.source_type, l.lead_source_detail
            FROM leads l
            WHERE 1=1 {lead_filter}
            ORDER BY l.created_at DESC
            LIMIT 6
        """))
        recent_leads = [dict(r._mapping) for r in rl_res.fetchall()]

    # Top performers
    top_performers = []
    if can_view_reports:
        tp_res = await db.execute(text("""
            SELECT 
              u.id, u.name, u.role, u.avatar_url,
              COUNT(l.id)::int as won_leads,
              COALESCE(SUM(l.estimated_value), 0)::numeric as total_revenue
            FROM users u
            JOIN leads l ON l.assigned_to_user_id = u.id AND l.status = 'won'
            GROUP BY u.id, u.name, u.role, u.avatar_url
            ORDER BY total_revenue DESC, won_leads DESC
            LIMIT 5
        """))
        top_performers = [dict(r._mapping) for r in tp_res.fetchall()]

    # Traffic summary
    traffic_summary = {"visitorsToday": 0, "visitors7d": 0}
    if can_view_analytics:
        try:
            ts_res = await db.execute(text("""
                SELECT 
                  COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN session_id END)::int as today,
                  COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN session_id END)::int as past_7d
                FROM analytics_events 
                WHERE event_type = 'pageview' AND page_path NOT LIKE '/admin%'
            """))
            ts = ts_res.first()
            if ts:
                traffic_summary = {"visitorsToday": int(ts.today or 0), "visitors7d": int(ts.past_7d or 0)}
        except Exception:
            pass

    # Jobs stage map
    stage_map = {
        "permit_pending": 0, "material_order": 0, "scheduled": 0,
        "in_progress": 0, "punch_list": 0, "final_inspection": 0, "complete": 0
    }
    if jobs_scope:
        sm_res = await db.execute(text("SELECT status, COUNT(*)::int as count FROM jobs GROUP BY status"))
        for r in sm_res.fetchall():
            if r.status in stage_map:
                stage_map[r.status] = int(r.count)

    # Live recent activity feed
    act_res = await db.execute(text("""
        SELECT
          a.id, a.activity_type, a.title, a.description, a.performed_by, a.created_at,
          COALESCE(l.full_name, c.full_name) as lead_name
        FROM activities a
        LEFT JOIN leads l ON a.entity_type = 'lead' AND a.entity_id = l.id
        LEFT JOIN clients c ON a.entity_type = 'client' AND a.entity_id = c.id
        ORDER BY a.created_at DESC
        LIMIT 8
    """))
    recent_activities = [dict(r._mapping) for r in act_res.fetchall()]

    def calc_delta(curr: Any, prev: Any) -> Dict[str, Any]:
        c = int(curr or 0)
        p = int(prev or 0)
        if p == 0 and c == 0: return {"delta": "—", "isPositive": True}
        if p == 0: return {"delta": f"+{c * 100}%", "isPositive": True}
        pct = round(((c - p) / p) * 100)
        return {"delta": f"{'+' if pct > 0 else ''}{pct}%", "isPositive": pct >= 0}

    # 8-week sparklines
    sparkline_rows = []
    if leads_scope:
        try:
            sp_res = await db.execute(text("""
                SELECT
                    date_trunc('week', created_at)::date::text as week,
                    COUNT(*) FILTER (WHERE status != 'lost') as new_leads,
                    COUNT(*) FILTER (WHERE status != 'lost' AND (pipeline_stage != 'stage_1_lead_gen' OR last_contact_at IS NOT NULL)) as connected,
                    COUNT(*) FILTER (WHERE status != 'lost' AND pipeline_stage = 'stage_3_site_visit_estimate') as scheduled,
                    COUNT(*) FILTER (WHERE status = 'won') as won,
                    COUNT(*) FILTER (WHERE status = 'lost') as lost
                FROM leads
                WHERE created_at >= NOW() - INTERVAL '8 weeks'
                GROUP BY date_trunc('week', created_at)
                ORDER BY week ASC
            """))
            sparkline_rows = [dict(r._mapping) for r in sp_res.fetchall()]
        except Exception:
            pass

    def to_points(field: str) -> List[int]:
        pts = [int(r.get(field) or 0) for r in sparkline_rows]
        while len(pts) < 2: pts.insert(0, 0)
        return pts

    k = kpi_row
    return {
        "userRole": user.get("role"),
        "userId": user["id"],
        "userName": user.get("name"),
        "followUpThresholdHours": follow_up_threshold_hours,
        "kpis": {
            "newLeadsThisWeek": int(k.new_leads or 0) if k else 0,
            "activeJobs": int(k.active_jobs or 0) if k else 0,
            "pendingEstimates": int(k.est_sent or 0) if k else 0,
            "revenueMtd": float(k.revenue_mtd or 0) if (k and can_view_profit) else 0.0,
        },
        "sixKpis": {
            "newLeads": {"count": int(k.new_leads or 0) if k else 0, **calc_delta(k.new_leads if k else 0, k.prev_new_leads if k else 0), "sparkPoints": to_points("new_leads")},
            "connected": {"count": int(k.connected_leads or 0) if k else 0, **calc_delta(k.connected_leads if k else 0, k.prev_connected if k else 0), "sparkPoints": to_points("connected")},
            "estScheduled": {"count": int(k.est_scheduled or 0) if k else 0, **calc_delta(k.est_scheduled if k else 0, k.prev_scheduled if k else 0), "sparkPoints": to_points("scheduled")},
            "estSent": {"count": int(k.est_sent or 0) if k else 0, **calc_delta(k.est_sent if k else 0, k.prev_est_sent if k else 0), "sparkPoints": to_points("scheduled")},
            "jobsWon": {"count": int(k.jobs_won or 0) if k else 0, **calc_delta(k.jobs_won if k else 0, k.prev_jobs_won if k else 0), "sparkPoints": to_points("won")},
            "lostClosed": {"count": int(k.lost_closed or 0) if k else 0, **calc_delta(k.lost_closed if k else 0, k.prev_lost_closed if k else 0), "sparkPoints": to_points("lost")},
        },
        "recentActivities": recent_activities,
        "needsFollowUp": needs_follow_up,
        "myTasks": my_tasks,
        "activeJobs": active_jobs,
        "recentLeads": recent_leads,
        "topPerformers": top_performers,
        "trafficSummary": traffic_summary,
        "jobsStageMap": stage_map,
    }

# ── REPORTS & FUNNEL ─────────────────────────────────────────────────────────

@router.get("/reports")
async def get_reports(
    user: Dict[str, Any] = Depends(require_any_permission(["analytics:view", "finances:view_profit_ledger"])),
    db: AsyncSession = Depends(get_db)
):
    can_view_profits = has_permission(user, "finances:view_profit_ledger")

    l_stats_res = await db.execute(text("""
        SELECT 
            COUNT(*) as total_leads,
            COUNT(CASE WHEN status IN ('contacted', 'inspected', 'quoted', 'won') THEN 1 END) as contacted,
            COUNT(CASE WHEN status IN ('inspected', 'quoted', 'won') THEN 1 END) as inspected,
            COUNT(CASE WHEN status IN ('quoted', 'won') THEN 1 END) as quoted,
            COUNT(CASE WHEN status = 'won' THEN 1 END) as won
        FROM leads
    """))
    l_stats = l_stats_res.first()

    j_stats_res = await db.execute(text("SELECT COUNT(*) as count, COALESCE(SUM(contract_value), 0) as total_contract FROM jobs"))
    j_stats = j_stats_res.first()

    comp_res = await db.execute(text("SELECT COUNT(*) as count FROM jobs WHERE status = 'complete'"))
    completed_count = int(comp_res.scalar() or 0)

    total_leads = int(l_stats.total_leads or 0) if l_stats else 0
    contacted = int(l_stats.contacted or 0) if l_stats else 0
    inspected = int(l_stats.inspected or 0) if l_stats else 0
    quoted = int(l_stats.quoted or 0) if l_stats else 0
    won = max(int(l_stats.won or 0) if l_stats else 0, int(j_stats.count or 0) if j_stats else 0)

    funnel = [
        {"stage": "Leads Captured", "count": total_leads, "conversionPct": 100, "dropoffPct": str(round(((total_leads - contacted) / total_leads) * 100, 1)) if total_leads > 0 else "0"},
        {"stage": "Contacted & Qualified", "count": contacted, "conversionPct": str(round((contacted / total_leads) * 100, 1)) if total_leads > 0 else "0", "dropoffPct": str(round(((contacted - inspected) / contacted) * 100, 1)) if contacted > 0 else "0"},
        {"stage": "Roof Inspected", "count": inspected, "conversionPct": str(round((inspected / total_leads) * 100, 1)) if total_leads > 0 else "0", "dropoffPct": str(round(((inspected - quoted) / inspected) * 100, 1)) if inspected > 0 else "0"},
        {"stage": "Proposal Quoted", "count": quoted, "conversionPct": str(round((quoted / total_leads) * 100, 1)) if total_leads > 0 else "0", "dropoffPct": str(round(((quoted - won) / quoted) * 100, 1)) if quoted > 0 else "0"},
        {"stage": "Won / Signed Contract", "count": won, "conversionPct": str(round((won / total_leads) * 100, 1)) if total_leads > 0 else "0", "dropoffPct": str(round(((won - completed_count) / won) * 100, 1)) if won > 0 else "0"},
        {"stage": "Roof Completed & Passed", "count": completed_count, "conversionPct": str(round((completed_count / total_leads) * 100, 1)) if total_leads > 0 else "0", "dropoffPct": "0"},
    ]

    # Territory jobs
    terr_jobs_res = await db.execute(text("""
        SELECT 
            COALESCE(NULLIF(TRIM(city), ''), 'San Diego County') as city,
            COUNT(*) as job_count,
            SUM(contract_value) as total_revenue,
            AVG(contract_value) as avg_ticket,
            COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed_count
        FROM jobs
        GROUP BY COALESCE(NULLIF(TRIM(city), ''), 'San Diego County')
        ORDER BY total_revenue DESC
        LIMIT 10
    """))
    territory = [
        {
            "city": r.city,
            "jobCount": int(r.job_count),
            "totalRevenue": float(r.total_revenue or 0),
            "avgTicket": round(float(r.avg_ticket or 0)),
            "completedCount": int(r.completed_count),
        }
        for r in terr_jobs_res.fetchall()
    ]

    # Territory leads
    terr_leads_res = await db.execute(text("""
        SELECT 
            COALESCE(NULLIF(TRIM(city), ''), 'Escondido') as city,
            COUNT(*) as lead_count
        FROM leads
        GROUP BY COALESCE(NULLIF(TRIM(city), ''), 'Escondido')
        ORDER BY lead_count DESC
        LIMIT 10
    """))
    territory_leads = [{"city": r.city, "leadCount": int(r.lead_count)} for r in terr_leads_res.fetchall()]

    # Services breakdown
    services_res = await db.execute(text("""
        SELECT 
            COALESCE(NULLIF(material_type, ''), 'Owens Corning Shingles') as material_type,
            COUNT(*) as job_count,
            SUM(contract_value) as total_revenue,
            AVG(contract_value) as avg_contract
        FROM jobs
        GROUP BY COALESCE(NULLIF(material_type, ''), 'Owens Corning Shingles')
        ORDER BY total_revenue DESC
    """))
    services = [
        {
            "materialType": r.material_type,
            "jobCount": int(r.job_count),
            "totalRevenue": float(r.total_revenue or 0),
            "avgContract": round(float(r.avg_contract or 0)),
        }
        for r in services_res.fetchall()
    ]

    # Cashflow forecast
    fc_res = await db.execute(text("""
        SELECT 
            COALESCE(SUM(CASE WHEN status != 'paid' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN amount ELSE 0 END), 0) as next_30,
            COALESCE(SUM(CASE WHEN status != 'paid' AND due_date BETWEEN CURRENT_DATE + INTERVAL '31 days' AND CURRENT_DATE + INTERVAL '60 days' THEN amount ELSE 0 END), 0) as days_31_60,
            COALESCE(SUM(CASE WHEN status != 'paid' AND due_date BETWEEN CURRENT_DATE + INTERVAL '61 days' AND CURRENT_DATE + INTERVAL '90 days' THEN amount ELSE 0 END), 0) as days_61_90,
            COALESCE(SUM(CASE WHEN (status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE)) THEN amount ELSE 0 END), 0) as overdue
        FROM invoices
    """))
    fc = fc_res.first()

    # Invoice sums & expenses
    inv_sums_res = await db.execute(text("""
        SELECT 
            COALESCE(SUM(amount), 0) as total_billed,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_collected,
            COALESCE(SUM(CASE WHEN status != 'paid' THEN amount ELSE 0 END), 0) as total_pending
        FROM invoices
    """))
    inv_sums = inv_sums_res.first()

    exp_res = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM job_expenses"))
    total_expenses = float(exp_res.scalar() or 0.0)

    total_contract = float(j_stats.total_contract if j_stats else 0.0)
    total_collected = float(inv_sums.total_collected if inv_sums else 0.0)
    total_pending = float(inv_sums.total_pending if inv_sums else 0.0)
    total_profit = max(0.0, total_contract - total_expenses)
    realized_margin_pct = round((total_profit / total_contract) * 100, 1) if total_contract > 0 else 38.5

    overdue = float(fc.overdue if fc else 0)
    next_30 = float(fc.next_30 if fc else 0)
    days_31_60 = float(fc.days_31_60 if fc else 0)
    days_61_90 = float(fc.days_61_90 if fc else 0)

    return {
        "funnel": funnel,
        "territory": territory,
        "territoryLeads": territory_leads,
        "services": services,
        "cashFlowForecast": {
            "overdue": overdue,
            "next30": next_30,
            "days31to60": days_31_60,
            "days61to90": days_61_90,
            "totalForecast": overdue + next_30 + days_31_60 + days_61_90,
        },
        "summary": {
            "totalLeads": total_leads,
            "totalJobs": int(j_stats.count if j_stats else 0),
            "totalContractValue": total_contract,
            "totalCollected": total_collected,
            "totalPending": total_pending,
            "totalExpenses": total_expenses if can_view_profits else 0,
            "totalProfit": total_profit if can_view_profits else 0,
            "realizedMarginPct": realized_margin_pct if can_view_profits else 0,
            "winRatePct": str(round((won / total_leads) * 100, 1)) if total_leads > 0 else "0",
        }
    }

# ── REPUTATION & REVIEWS ─────────────────────────────────────────────────────

@router.get("/reviews")
async def get_reviews(
    status: Optional[str] = None,
    rating: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    conditions = []
    params: Dict[str, Any] = {}

    if status and status != "all":
        params["status"] = status
        conditions.append("r.status = :status")

    if rating and rating != "all":
        if rating == "5": conditions.append("r.rating = 5")
        elif rating == "4": conditions.append("r.rating = 4")
        elif rating == "below_4": conditions.append("r.rating < 4")

    if search and search.strip():
        s = search.strip().lower()
        params["search"] = f"%{s}%"
        conditions.append("""(
            LOWER(r.customer_name) LIKE :search OR
            LOWER(COALESCE(r.customer_city, '')) LIKE :search OR
            LOWER(COALESCE(r.feedback, '')) LIKE :search OR
            LOWER(COALESCE(r.service_type, '')) LIKE :search
        )""")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    stmt = text(f"""
        SELECT r.*, 
               l.phone as customer_phone, l.email as customer_email,
               j.job_number
        FROM reviews r
        LEFT JOIN leads l ON r.lead_id = l.id
        LEFT JOIN jobs j ON r.job_id = j.id
        {where_clause}
        ORDER BY r.created_at DESC
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]

    stats_res = await db.execute(text("""
        SELECT 
            COUNT(*) as total_reviews,
            ROUND(COALESCE(AVG(rating), 5.0)::numeric, 1) as avg_rating,
            COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
            COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_count,
            COUNT(CASE WHEN google_clicked = true THEN 1 END) as google_clicked_count
        FROM reviews
    """))
    stats = stats_res.first()

    total = int(stats.total_reviews or 0) if stats else 0
    five_stars = int(stats.five_star_count or 0) if stats else 0
    five_star_pct = round((five_stars / total) * 100) if total > 0 else 100

    return {
        "reviews": rows,
        "summary": {
            "totalReviews": total,
            "avgRating": float(stats.avg_rating if stats else 5.0),
            "fiveStarPct": five_star_pct,
            "escalatedCount": int(stats.escalated_count or 0) if stats else 0,
            "googleClickedCount": int(stats.google_clicked_count or 0) if stats else 0,
        }
    }

@router.post("/reviews")
async def create_review_request(
    payload: CreateReviewRequestPayload,
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    cust_name = payload_dict.get("customerName")
    if not cust_name:
        raise HTTPException(status_code=400, detail="Customer name is required")

    lead_id = int(payload_dict["leadId"]) if payload_dict.get("leadId") else None
    job_id = int(payload_dict["jobId"]) if payload_dict.get("jobId") else None
    token = f"REV-{datetime.now(timezone.utc).strftime('%y%m%d%H%M')}-{secrets.token_hex(4).upper()}"

    client_id = None
    if lead_id:
        l = await db.execute(text("SELECT client_id FROM leads WHERE id = :id"), {"id": lead_id})
        r = l.first()
        if r and r.client_id: client_id = int(r.client_id)
    if not client_id and job_id:
        j = await db.execute(text("SELECT client_id FROM jobs WHERE id = :id"), {"id": job_id})
        r = j.first()
        if r and r.client_id: client_id = int(r.client_id)

    stmt = text("""
        INSERT INTO reviews (
            lead_id, job_id, client_id, customer_name, customer_city, rating,
            service_type, source, status, review_token
        ) VALUES (:lid, :jid, :cid, :name, :city, :rating, :stype, :source, 'pending', :token)
        RETURNING *
    """)
    res = await db.execute(stmt, {
        "lid": lead_id,
        "jid": job_id,
        "cid": client_id,
        "name": cust_name,
        "city": payload_dict.get("customerCity", "San Diego"),
        "rating": int(payload_dict.get("initialRating", 5)),
        "stype": payload_dict.get("serviceType", "Roof Replacement"),
        "source": payload_dict.get("source", "sms_request"),
        "token": token,
    })
    review = dict(res.first()._mapping)

    if lead_id:
        await db.execute(
            text("""
                INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by)
                VALUES ('lead', :lid, :cid, 'message', :title, :desc, 'Reputation Engine')
            """),
            {
                "lid": lead_id,
                "cid": client_id,
                "title": f"Review Request Dispatched to {cust_name}",
                "desc": f"Sent automated review request link (/review/{token}).",
            }
        )

    await db.commit()
    return {"ok": True, "review": review, "reviewLink": f"/review/{token}"}

@router.patch("/reviews")
async def update_review(
    payload: UpdateReviewPayload,
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    payload_dict = payload.model_dump(exclude_unset=True)
    rid = payload_dict.get("id")
    if not rid:
        raise HTTPException(status_code=400, detail="Review ID is required")

    updates = ["updated_at = NOW()"]
    params: Dict[str, Any] = {"id": int(rid)}

    if "status" in payload_dict:
        params["status"] = payload_dict["status"]
        updates.append("status = :status")

    if "feedback" in payload_dict:
        params["feedback"] = payload_dict["feedback"]
        updates.append("feedback = :feedback")

    stmt = text(f"UPDATE reviews SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    await db.commit()
    row = res.first()
    return {"ok": True, "review": dict(row._mapping) if row else None}

@router.delete("/reviews")
async def delete_review(
    id: int = Query(...),
    user: Dict[str, Any] = Depends(require_permission("reviews:manage")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM reviews WHERE id = :id"), {"id": id})
    await db.commit()
    return {"ok": True}


# ── BOT SHIELD & HONEYPOT AUDIT ──────────────────────────────────────────────

@router.get("/spam-shield")
async def get_spam_shield(
    request: Request,
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    days: Optional[int] = Query(None, ge=1, le=1100),
    hours: Optional[int] = Query(None, ge=1, le=168),
    timeframe: Optional[str] = Query(None),
    user: Dict[str, Any] = Depends(require_any_permission(["analytics:view", "reports:view", "reports.view"])),
    db: AsyncSession = Depends(get_db)
):
    tf = (timeframe or "").strip().lower()
    if tf == "2h":
        hours = 2
        days = None
    elif tf == "24h" or tf == "today":
        hours = 24
        days = None
    elif tf == "7d":
        days = 7
        hours = None
    elif tf == "30d":
        days = 30
        hours = None
    elif tf == "90d":
        days = 90
        hours = None
    elif tf == "ytd":
        now_dt = datetime.now(timezone.utc)
        start_of_year = datetime(now_dt.year, 1, 1, tzinfo=timezone.utc)
        days = max(1, (now_dt - start_of_year).days)
        hours = None
    elif tf in ("365d", "1y", "year"):
        days = 365
        hours = None
    elif tf in ("730d", "2y", "2years"):
        days = 730
        hours = None

    date_regex = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    time_params: dict = {}
    valid_custom_dates = False
    is_hourly = False

    if from_date and to_date and date_regex.match(from_date.strip()) and date_regex.match(to_date.strip()):
        try:
            parsed_from = datetime.strptime(from_date.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
            parsed_to = datetime.strptime(to_date.strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
            time_params = {"from_dt": parsed_from, "to_dt": parsed_to}
            valid_custom_dates = True
        except ValueError:
            valid_custom_dates = False

    if not valid_custom_dates:
        now = datetime.now(timezone.utc)
        if hours:
            time_params = {"from_dt": now - timedelta(hours=int(hours)), "to_dt": now}
            is_hourly = True
        else:
            num_days = int(days) if days is not None else 30
            time_params = {"from_dt": now - timedelta(days=num_days), "to_dt": now}

    time_clause = "submitted_at >= :from_dt AND submitted_at < :to_dt"

    # 1. Total counts by reason
    kpi_query = text(f"""
        SELECT
            COUNT(*) AS total_blocked,
            COUNT(*) FILTER (WHERE block_reason = 'honeypot') AS honeypot_caught,
            COUNT(*) FILTER (WHERE block_reason = 'speed_trap') AS speed_trap_caught,
            COUNT(*) FILTER (WHERE block_reason = 'invalid_phone') AS invalid_phone_caught,
            COUNT(*) FILTER (WHERE block_reason = 'spam_content') AS spam_content_caught,
            COUNT(*) FILTER (WHERE block_reason = 'turnstile') AS turnstile_caught
        FROM spam_attempts
        WHERE {time_clause}
    """)
    kpi_res = (await db.execute(kpi_query, time_params)).first()
    
    total_blocked = int(kpi_res.total_blocked or 0) if kpi_res else 0
    honeypot_caught = int(kpi_res.honeypot_caught or 0) if kpi_res else 0
    speed_trap_caught = int(kpi_res.speed_trap_caught or 0) if kpi_res else 0
    invalid_phone_caught = int(kpi_res.invalid_phone_caught or 0) if kpi_res else 0
    spam_content_caught = int(kpi_res.spam_content_caught or 0) if kpi_res else 0
    turnstile_caught = int(kpi_res.turnstile_caught or 0) if kpi_res else 0

    # 2. Timeline
    if is_hourly:
        timeline_q = text(f"""
            SELECT TO_CHAR(DATE_TRUNC('hour', submitted_at), 'YYYY-MM-DD HH24:00') AS day,
                   TO_CHAR(DATE_TRUNC('hour', submitted_at), 'HH12 AM') AS label,
                   COUNT(*) AS count
            FROM spam_attempts
            WHERE {time_clause}
            GROUP BY 1, 2
            ORDER BY 1 ASC
        """)
    else:
        timeline_q = text(f"""
            SELECT TO_CHAR(DATE_TRUNC('day', submitted_at), 'YYYY-MM-DD') AS day,
                   TO_CHAR(DATE_TRUNC('day', submitted_at), 'Mon DD') AS label,
                   COUNT(*) AS count
            FROM spam_attempts
            WHERE {time_clause}
            GROUP BY 1, 2
            ORDER BY 1 ASC
        """)
    timeline_rows = (await db.execute(timeline_q, time_params)).fetchall()
    timeline = [{"day": r.day, "label": r.label, "count": int(r.count)} for r in timeline_rows]

    # 3. Block reason breakdown
    reason_q = text(f"""
        SELECT block_reason AS reason, COUNT(*) AS count
        FROM spam_attempts
        WHERE {time_clause}
        GROUP BY 1
        ORDER BY count DESC
    """)
    reason_rows = (await db.execute(reason_q, time_params)).fetchall()
    block_reason_breakdown = [
        {
            "reason": r.reason,
            "count": int(r.count),
            "pct": round((int(r.count) / total_blocked * 100), 1) if total_blocked > 0 else 0
        }
        for r in reason_rows
    ]

    # 4. Form type breakdown
    form_q = text(f"""
        SELECT COALESCE(form_type, 'unknown') AS form_type, COUNT(*) AS count
        FROM spam_attempts
        WHERE {time_clause}
        GROUP BY 1
        ORDER BY count DESC
    """)
    form_rows = (await db.execute(form_q, time_params)).fetchall()
    form_type_breakdown = [{"form_type": r.form_type, "count": int(r.count)} for r in form_rows]

    # 5. Top Offending IPs
    ip_q = text(f"""
        SELECT ip_address AS ip, COUNT(*) AS count
        FROM spam_attempts
        WHERE {time_clause} AND ip_address IS NOT NULL AND ip_address != ''
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 10
    """)
    ip_rows = (await db.execute(ip_q, time_params)).fetchall()
    top_ips = [{"ip": r.ip, "count": int(r.count)} for r in ip_rows]

    # 6. Recent 50 attempts
    recent_q = text(f"""
        SELECT id, block_reason, block_detail, form_type, ip_address, page_referer, submitted_at, payload_snapshot
        FROM spam_attempts
        ORDER BY submitted_at DESC
        LIMIT 50
    """)
    recent_rows = (await db.execute(recent_q)).fetchall()
    recent_attempts = [
        {
            "id": r.id,
            "block_reason": r.block_reason,
            "block_detail": r.block_detail,
            "form_type": r.form_type,
            "ip_address": r.ip_address,
            "page_referer": r.page_referer,
            "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
            "payload_snapshot": r.payload_snapshot,
        }
        for r in recent_rows
    ]

    return {
        "totalBlocked": total_blocked,
        "honeypotCaught": honeypot_caught,
        "speedTrapCaught": speed_trap_caught,
        "invalidPhoneCaught": invalid_phone_caught,
        "spamContentCaught": spam_content_caught,
        "turnstileCaught": turnstile_caught,
        "timeline": timeline,
        "blockReasonBreakdown": block_reason_breakdown,
        "formTypeBreakdown": form_type_breakdown,
        "topIps": top_ips,
        "recentAttempts": recent_attempts,
    }

