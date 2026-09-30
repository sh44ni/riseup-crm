from app.core.logger import get_logger
import re
from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.audit import get_client_ip, get_user_agent
from app.middlewares.rate_limit import rate_limit
logger = get_logger(__name__)

router = APIRouter(tags=["Analytics"])

FEED_EVENTS = {
    "pageview", "call", "form_start", "form_submit", "button_click",
    "nav_click", "scroll", "session_end", "outbound_link", "estimate_view",
    "tab_switch", "image_view", "video_play", "estimate_submit", "contact_submit"
}

def detect_device(ua: str) -> str:
    if re.search(r"Mobi|Android", ua, re.I):
        return "mobile"
    if re.search(r"Tablet|iPad", ua, re.I):
        return "tablet"
    return "desktop"

@router.post("/api/track", dependencies=[Depends(rate_limit("analytics-track", 120, 60))])
async def track_web_event(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        body = await request.json()
        page_path = body.get("pagePath") or "/"

        # Discard internal admin visits
        if page_path.startswith("/admin") or page_path.startswith("/api/admin"):
            return {"ok": True, "ignored": "admin"}

        # Discard local development, loopback IPs, and localhost views
        client_ip = get_client_ip(request)
        if client_ip in ("127.0.0.1", "::1", "localhost", "0.0.0.0"):
            return {"ok": True, "ignored": "localhost_ip"}

        referrer = str(body.get("referrer") or request.headers.get("referer") or "")
        origin = str(request.headers.get("origin") or "")
        host = str(request.headers.get("host") or "")

        for check_val in (referrer, origin, host, page_path):
            low = check_val.lower()
            if "localhost" in low or "127.0.0.1" in low or "0.0.0.0" in low or ":3000" in low or ":5173" in low:
                return {"ok": True, "ignored": "localhost_environment"}

        session_id = body.get("sessionId") or "unknown_session"
        event_type = body.get("eventType") or "pageview"
        ua = get_user_agent(request)
        device = detect_device(ua)

        # Instant edge header geo extraction (0ms latency!)
        country = request.headers.get("cf-ipcountry") or ""
        city = request.headers.get("cf-ipcity") or ""

        if event_type == "call":
            await db.execute(text("""
                INSERT INTO call_events (session_id, page_path, device_type, country, city, created_at)
                VALUES (:sid, :path, :dev, :country, :city, NOW())
            """), {
                "sid": session_id,
                "path": page_path,
                "dev": device,
                "country": country,
                "city": city,
            })

        # Insert to analytics_events
        await db.execute(text("""
            INSERT INTO analytics_events (
                session_id, event_type, page_path, element, label, x_pct, y_pct,
                scroll_pct, referrer, user_agent, device_type, country, city,
                utm_source, utm_medium, utm_campaign, duration_ms, created_at
            ) VALUES (
                :sid, :etype, :path, :element, :label, :x, :y,
                :scroll, :ref, :ua, :dev, :country, :city,
                :usrc, :umed, :ucamp, :dur, NOW()
            )
        """), {
            "sid": session_id,
            "etype": event_type,
            "path": page_path,
            "element": body.get("element"),
            "label": body.get("label"),
            "x": float(body.get("xPct")) if body.get("xPct") is not None else None,
            "y": float(body.get("yPct")) if body.get("yPct") is not None else None,
            "scroll": int(body.get("scrollPct")) if body.get("scrollPct") is not None else None,
            "ref": body.get("referrer"),
            "ua": ua,
            "dev": device,
            "country": country,
            "city": city,
            "usrc": body.get("utmSource"),
            "umed": body.get("utmMedium"),
            "ucamp": body.get("utmCampaign"),
            "dur": int(body.get("durationMs")) if body.get("durationMs") is not None else None,
        })

        # Insert to activity_log for human-readable feed events
        if event_type in FEED_EVENTS:
            await db.execute(text("""
                INSERT INTO activity_log (
                    session_id, event_type, page_path, label, element,
                    device_type, country, city, scroll_pct, duration_ms,
                    utm_source, utm_medium, utm_campaign, created_at
                ) VALUES (
                    :sid, :etype, :path, :label, :element,
                    :dev, :country, :city, :scroll, :dur,
                    :usrc, :umed, :ucamp, NOW()
                )
            """), {
                "sid": session_id,
                "etype": event_type,
                "path": page_path,
                "label": body.get("label") or body.get("element"),
                "element": body.get("element"),
                "dev": device,
                "country": country,
                "city": city,
                "scroll": int(body.get("scrollPct")) if body.get("scrollPct") is not None else None,
                "dur": int(body.get("durationMs")) if body.get("durationMs") is not None else None,
                "usrc": body.get("utmSource"),
                "umed": body.get("utmMedium"),
                "ucamp": body.get("utmCampaign"),
            })

        return {"ok": True}
    except Exception as e:
        # Silently log error, never break public visitor session
        logger.error(f"{e}")
        return {"ok": False}
