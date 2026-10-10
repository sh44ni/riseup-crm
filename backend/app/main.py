import os
import time
import asyncio
from datetime import date, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.staticfiles import StaticFiles

from app.core.logger import setup_logging, get_logger
from app.core.config import settings
from app.core.database import engine
from app.core.redis import init_redis, close_redis, get_redis
from app.core.errors import DomainError
from app.api.router import api_router
from app.api.docs_notes import DOCS_DESCRIPTION
from app.middlewares.telemetry import TelemetryMiddleware
logger = get_logger(__name__)

STATIC_DEV_DIR = os.path.join(os.path.dirname(__file__), "static", "developer")
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static"))
os.makedirs(STATIC_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
    logger.info(f"Starting Rise Up Roofing FastAPI backend & Developer Engine...")
    setup_logging()
    from app.core.sentry import init_sentry
    init_sentry()
    await init_redis()

    # ── Database Health Check & Schema Init ──
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS spam_attempts (
                    id BIGSERIAL PRIMARY KEY,
                    block_reason VARCHAR(64) NOT NULL,
                    block_detail TEXT,
                    form_type VARCHAR(64),
                    ip_address VARCHAR(128),
                    user_agent TEXT,
                    page_referer TEXT,
                    payload_snapshot JSONB,
                    submitted_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_spam_attempts_submitted_at ON spam_attempts (submitted_at DESC)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_spam_attempts_block_reason ON spam_attempts (block_reason)"))
            for stmt in [
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Due Upon Receipt'",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_to_email TEXT",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2)",
                "ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12, 2)",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6, 3) DEFAULT 0",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(12, 2) DEFAULT 0",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS accepted_methods JSONB DEFAULT '[]'::jsonb",
                "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_instructions TEXT",
                "CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000",
                "UPDATE invoices SET status = 'pending' WHERE status IN ('sent', 'draft')",
            ]:
                await conn.execute(text(stmt))
            os.makedirs(os.path.join(STATIC_DIR, "uploads", "invoices"), exist_ok=True)
        logger.warning("Async PostgreSQL connection, spam_attempts, and invoices schema healthy.")
    except Exception as e:
        logger.warning(f"Startup connection/schema notice: {e}")

    # Seed system RBAC permissions and default Owner role
    try:
        async with engine.begin() as conn:
            from app.core.permissions import seed_system_rbac
            await seed_system_rbac(conn)
    except Exception as e:
        logger.warning(f"Startup RBAC seeding notice: {e}")

    # Background task: take daily stats snapshot + backfill
    async def _take_snapshot():
        from app.core.database import async_session_factory
        from sqlalchemy import text as _text
        from datetime import date as _date, datetime as _datetime, time as _time, timedelta as _timedelta
        try:
            async with async_session_factory() as session:
                # Backfill last 30 days if empty
                existing = await session.execute(_text("SELECT COUNT(*) FROM daily_stats_snapshots"))
                count = existing.scalar() or 0
                if count == 0:
                    today = _date.today()
                    # Backfill: for each of last 30 days, count leads created on or before that date
                    for days_ago in range(30, -1, -1):
                        snap_date = today - _timedelta(days=days_ago)
                        cutoff_dt = _datetime.combine(snap_date + _timedelta(days=1), _time.min)
                        await session.execute(_text("""
                            INSERT INTO daily_stats_snapshots (snapshot_date, new_leads, contacted, est_scheduled, est_sent, jobs_won, lost_closed, ytd_revenue, active_crew, total_pipeline_value)
                            SELECT
                                :snap_date,
                                COUNT(*) FILTER (WHERE (pipeline_stage IN ('stage_1_lead_gen','cold_lead','new_leads') OR pipeline_stage IS NULL) AND status != 'lost' AND created_at <= :cutoff_dt),
                                COUNT(*) FILTER (WHERE pipeline_stage IN ('stage_2_initial_contact','initial_call','contacted') AND status != 'lost' AND created_at <= :cutoff_dt),
                                COUNT(*) FILTER (WHERE pipeline_stage IN ('est_scheduled','inspection_scheduled','inspection_completed','estimate_building') AND status != 'lost' AND created_at <= :cutoff_dt),
                                COUNT(*) FILTER (WHERE pipeline_stage IN ('estimate_sent','est_sent','follow_up','followup_2day','followup_7day','decision_followup') AND status NOT IN ('lost','won') AND created_at <= :cutoff_dt),
                                COUNT(*) FILTER (WHERE (pipeline_stage IN ('contract_signed','active_jobs','closed_won','job_completed','completed') OR status = 'won') AND created_at <= :cutoff_dt),
                                COUNT(*) FILTER (WHERE (status = 'lost' OR pipeline_stage IN ('lost','closed_lost')) AND created_at <= :cutoff_dt),
                                0, 0, 0
                            FROM leads
                            ON CONFLICT (snapshot_date) DO NOTHING
                        """), {"snap_date": snap_date, "cutoff_dt": cutoff_dt})
                    await session.commit()
                    logger.info(f"Backfilled 31 days of dashboard history")
                else:
                    # Just take today's snapshot
                    await session.execute(_text("""
                        INSERT INTO daily_stats_snapshots (snapshot_date, new_leads, contacted, est_scheduled, est_sent, jobs_won, lost_closed, ytd_revenue, active_crew, total_pipeline_value)
                        SELECT
                            CURRENT_DATE,
                            COUNT(*) FILTER (WHERE (pipeline_stage IN ('stage_1_lead_gen','cold_lead','new_leads') OR pipeline_stage IS NULL) AND status != 'lost'),
                            COUNT(*) FILTER (WHERE pipeline_stage IN ('stage_2_initial_contact','initial_call','contacted') AND status != 'lost'),
                            COUNT(*) FILTER (WHERE pipeline_stage IN ('est_scheduled','inspection_scheduled','inspection_completed','estimate_building') AND status != 'lost'),
                            COUNT(*) FILTER (WHERE pipeline_stage IN ('estimate_sent','est_sent','follow_up','followup_2day','followup_7day','decision_followup') AND status NOT IN ('lost','won')),
                            COUNT(*) FILTER (WHERE (pipeline_stage IN ('contract_signed','active_jobs','closed_won','job_completed','completed') OR status = 'won')),
                            COUNT(*) FILTER (WHERE status = 'lost' OR pipeline_stage IN ('lost','closed_lost')),
                            COALESCE((SELECT SUM(contract_value) FROM jobs WHERE EXTRACT(year FROM created_at) = EXTRACT(year FROM NOW()) AND status != 'cancelled'), 0),
                            COALESCE((SELECT COUNT(*) FROM crew_members WHERE active = true), 0),
                            COALESCE(SUM(estimated_value) FILTER (WHERE status NOT IN ('lost','completed')), 0)
                        FROM leads
                        ON CONFLICT (snapshot_date) DO UPDATE SET
                            new_leads = EXCLUDED.new_leads,
                            contacted = EXCLUDED.contacted,
                            est_scheduled = EXCLUDED.est_scheduled,
                            est_sent = EXCLUDED.est_sent,
                            jobs_won = EXCLUDED.jobs_won,
                            lost_closed = EXCLUDED.lost_closed,
                            ytd_revenue = EXCLUDED.ytd_revenue,
                            active_crew = EXCLUDED.active_crew,
                            total_pipeline_value = EXCLUDED.total_pipeline_value
                    """))
                    await session.commit()
                    logger.info(f"Today's dashboard snapshot recorded")
        except Exception as e:
            logger.error(f"Error: {e}")
    
    asyncio.create_task(_take_snapshot())

    # Ensure uploads directory structure exists
    avatars_dir = os.path.join(STATIC_DIR, "uploads", "avatars")
    os.makedirs(avatars_dir, exist_ok=True)

    yield
    # ── Shutdown ──
    logger.info("Shutting down Rise Up Roofing FastAPI backend...")
    await close_redis()
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    description=DOCS_DESCRIPTION,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS Middleware ──
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "https://riseuprac.com",
    "https://www.riseuprac.com",
    "https://crm.riseuprac.com",
    "https://backend.riseuprac.com",
    "https://staging.riseuprac.com",
    "https://backend.staging.riseuprac.com",
    "https://website.riseuprac.com",
    "https://development.riseuprac.com",
    "https://riseuproofing.vercel.app",
    "https://riseup-roofing.vercel.app",
]
if hasattr(settings, "CORS_ORIGINS") and settings.CORS_ORIGINS:
    if isinstance(settings.CORS_ORIGINS, list):
        origins.extend(settings.CORS_ORIGINS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time", "X-Request-Id", "Content-Disposition"],
)

# ── Compression Middleware ──
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Telemetry & Live Request Ring Buffer Middleware ──
app.add_middleware(TelemetryMiddleware)

# ── Enterprise Security Headers & No-Store Middleware ──
from app.middlewares.security_headers import SecurityHeadersMiddleware
app.add_middleware(SecurityHeadersMiddleware)


# ── Custom Error Handlers with CORS Header Preservation ──
def _is_allowed_origin(origin: Optional[str]) -> bool:
    if not origin:
        return False
    if origin in origins or origin.endswith(".riseuprac.com"):
        return True
    if origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:"):
        return True
    return False

def _with_cors(response: JSONResponse, request: Request) -> JSONResponse:
    origin = request.headers.get("origin")
    if origin and _is_allowed_origin(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return _with_cors(JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "error": exc.detail, "detail": exc.detail},
    ), request)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"loc": list(e.get("loc", [])), "msg": e.get("msg", ""), "type": e.get("type", "")} for e in exc.errors()]
    first_error = errors[0]["msg"] if errors else "Invalid request data"
    return _with_cors(JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"ok": False, "error": first_error, "detail": first_error, "details": errors},
    ), request)

@app.exception_handler(DomainError)
async def domain_exception_handler(request: Request, exc: DomainError):
    request_id = getattr(request.state, "request_id", None)
    return _with_cors(JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(request_id=request_id),
    ), request)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.error("Unhandled exception (request_id=%s)", request_id, exc_info=exc)
    expose_detail = settings.DEBUG and settings.is_dev_like
    error_msg = str(exc) if expose_detail else "Internal server error. Please contact support."
    response = _with_cors(JSONResponse(
        status_code=500,
        content={"ok": False, "error": error_msg, "detail": error_msg, "request_id": request_id},
    ), request)
    if request_id:
        response.headers["X-Request-Id"] = request_id
    return response

# ── Mount Static Files ──
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── Mount Master API Router ──
app.include_router(api_router)

# ── Standalone Developer Dashboard UI ──
@app.get("/developer", response_class=HTMLResponse, tags=["Developer Dashboard"])
@app.get("/developer/{rest_of_path:path}", response_class=HTMLResponse, tags=["Developer Dashboard"])
@app.get("/developers", response_class=HTMLResponse, tags=["Developer Dashboard"])
@app.get("/developers/{rest_of_path:path}", response_class=HTMLResponse, tags=["Developer Dashboard"])
async def developer_dashboard():
    index_file = os.path.join(STATIC_DEV_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse("<h1>Developer Dashboard UI Not Found</h1>", status_code=404)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=status.HTTP_204_NO_CONTENT)

HEALTH_CHECK_TIMEOUT_SECONDS = 2.0


async def _check_database() -> bool:
    from sqlalchemy import text as _text
    try:
        async def _probe() -> None:
            async with engine.connect() as conn:
                await conn.execute(_text("SELECT 1"))
        await asyncio.wait_for(_probe(), timeout=HEALTH_CHECK_TIMEOUT_SECONDS)
        return True
    except Exception:
        logger.warning("Health check: database unreachable")
        return False


async def _check_redis() -> bool:
    try:
        client = get_redis()
        await asyncio.wait_for(client.ping(), timeout=HEALTH_CHECK_TIMEOUT_SECONDS)
        return True
    except Exception:
        logger.warning("Health check: redis unreachable")
        return False


from sqlalchemy.exc import SQLAlchemyError
from app.schemas.health import HealthCheckResponse, ReadinessCheckResponse


async def _check_migrations() -> bool:
    from sqlalchemy import text as _text
    try:
        async def _probe() -> bool:
            async with engine.connect() as conn:
                res = await conn.execute(_text("SELECT version_num FROM alembic_version LIMIT 1"))
                return bool(res.scalar_one_or_none())
        return await asyncio.wait_for(_probe(), timeout=HEALTH_CHECK_TIMEOUT_SECONDS)
    except (SQLAlchemyError, asyncio.TimeoutError, OSError):
        logger.warning("Readiness check: migrations unreachable or not applied")
        return False


# ── Root & Health Check ──
@app.get("/health", tags=["Health"], response_model=HealthCheckResponse)
@app.get("/", tags=["Health"], response_model=HealthCheckResponse)
async def health_check():
    db_ok = await _check_database()
    redis_ok = await _check_redis()
    healthy = db_ok and redis_ok

    return JSONResponse(
        status_code=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "service": settings.APP_NAME,
            "env": settings.ENVIRONMENT,
            "database": "connected" if db_ok else "unreachable",
            "redis": "connected" if redis_ok else "unreachable",
            "timestamp": time.time(),
        },
    )


# ── Readiness Probe (Kubernetes / ECS / Fly.io / Compose) ──
@app.get("/ready", tags=["Health"], response_model=ReadinessCheckResponse)
async def readiness_check():
    db_ok = await _check_database()
    redis_ok = await _check_redis()
    mig_ok = await _check_migrations()
    ready = db_ok and redis_ok and mig_ok

    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ready" if ready else "not_ready",
            "ready": ready,
            "database": "connected" if db_ok else "unreachable",
            "redis": "connected" if redis_ok else "unreachable",
            "migrations": "applied" if mig_ok else "unreachable",
            "timestamp": time.time(),
        },
    )

