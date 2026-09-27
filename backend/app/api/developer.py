import time
import sys
import platform
import asyncio
import secrets
import hashlib
import shutil
import importlib.metadata
import psutil
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Response, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, update, delete
import httpx
import orjson

from app.core.config import settings
from app.core.database import get_db, engine
from app.core.redis import get_redis, cache_delete, cache_get, cache_set
from app.core.developer_auth import (
    verify_seedphrase,
    create_developer_session,
    revoke_developer_session,
    require_developer_session,
)
from app.models.api_key import ApiKey
from app.middlewares.telemetry import (
    in_memory_logs,
    in_memory_counters,
    in_memory_latencies,
    in_memory_rpm,
)

router = APIRouter(prefix="/api/developer", tags=["Developer Dashboard & Telemetry"])

# ── Pydantic Request Schemas ──
class DeveloperLoginRequest(BaseModel):
    seedphrase: str

class ApiKeyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    environment: str = Field(default="live", pattern="^(live|test)$")
    scopes: List[str] = Field(default_factory=lambda: ["*"])
    rate_limit_per_minute: int = Field(default=120, ge=10, le=10000)
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])

class ApiKeyUpdateRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    scopes: Optional[List[str]] = None
    rate_limit_per_minute: Optional[int] = Field(None, ge=10, le=10000)
    allowed_origins: Optional[List[str]] = None

# ── 1. Developer Auth Endpoints ──

@router.post("/auth/login")
async def developer_login(payload: DeveloperLoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "unknown"
    is_valid = await verify_seedphrase(payload.seedphrase, client_ip)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid developer seedphrase. Access denied."
        )

    token = await create_developer_session(client_ip)

    # Set secure HttpOnly cookie
    response.set_cookie(
        key=settings.DEVELOPER_COOKIE_NAME,
        value=token,
        max_age=settings.DEVELOPER_SESSION_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
    )

    return {
        "ok": True,
        "token": token,
        "expires_in_hours": settings.DEVELOPER_SESSION_HOURS,
        "message": "Developer access granted."
    }

@router.post("/auth/logout")
async def developer_logout(request: Request, response: Response):
    token = request.cookies.get(settings.DEVELOPER_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

    if token:
        await revoke_developer_session(token)

    response.delete_cookie(settings.DEVELOPER_COOKIE_NAME)
    return {"ok": True, "message": "Developer session revoked."}

@router.get("/auth/check")
async def developer_auth_check(request: Request):
    token = request.cookies.get(settings.DEVELOPER_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1].strip()

    if not token:
        return {"authenticated": False}

    data = await cache_get(f"dev_session:{token}")
    return {"authenticated": data is not None}

# ── 2. System Status & Vitals ──

@router.get("/status")
async def get_system_status(
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """Real-time server resource usage, Postgres pool metrics, Redis latency, and ARQ queue depth."""
    # 1. Process & OS Vitals
    cpu_pct = 0.0
    mem_info = {"rss_mb": 0.0, "total_mb": 0.0, "percent": 0.0}
    try:
        import psutil
        cpu_pct = psutil.cpu_percent(interval=None)
        vm = psutil.virtual_memory()
        proc = psutil.Process()
        mem_info = {
            "rss_mb": round(proc.memory_info().rss / (1024 * 1024), 2),
            "total_mb": round(vm.total / (1024 * 1024), 2),
            "percent": vm.percent,
        }
    except Exception:
        pass

    # 2. PostgreSQL Connection Pool Vitals
    db_status = "connected"
    db_ping_ms = 0.0
    pool_stats = {
        "size": getattr(engine.pool, "size", lambda: 20)(),
        "checked_in": getattr(engine.pool, "checkedin", lambda: 0)(),
        "checked_out": getattr(engine.pool, "checkedout", lambda: 0)(),
        "overflow": getattr(engine.pool, "overflow", lambda: 0)(),
    }

    try:
        t0 = time.perf_counter()
        await db.execute(text("SELECT 1"))
        db_ping_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"error: {str(e)}"

    # 3. Redis 7 Vitals
    redis_status = "connected"
    redis_ping_ms = 0.0
    redis_info = {}
    try:
        redis = get_redis()
        t0 = time.perf_counter()
        await asyncio.wait_for(redis.ping(), timeout=0.25)
        redis_ping_ms = round((time.perf_counter() - t0) * 1000, 2)
        info = await asyncio.wait_for(redis.info(), timeout=0.25)
        redis_info = {
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "connected_clients": info.get("connected_clients", 0),
            "total_commands_processed": info.get("total_commands_processed", 0),
            "uptime_in_days": info.get("uptime_in_days", 0),
        }
    except Exception:
        redis_status = "offline (degraded)"

    # 4. Storage (MinIO / S3) status
    storage_status = "operational" if settings.S3_ENDPOINT_URL else "unconfigured"

    return {
        "ok": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "runtime": {
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "environment": settings.ENVIRONMENT,
            "cpu_percent": cpu_pct,
            "memory": mem_info,
        },
        "database": {
            "status": db_status,
            "ping_ms": db_ping_ms,
            "pool": pool_stats,
        },
        "redis": {
            "status": redis_status,
            "ping_ms": redis_ping_ms,
            "metrics": redis_info,
        },
        "storage": {
            "status": storage_status,
            "endpoint": settings.S3_ENDPOINT_URL,
            "media_bucket": settings.S3_BUCKET_MEDIA,
        }
    }

# ── 3. System Metrics & Telemetry ──

@router.get("/metrics")
async def get_system_metrics(
    token: str = Depends(require_developer_session)
):
    """Aggregate latency percentiles (p50, p95, p99), error rates, and RPM time-series."""
    redis_available = False
    curr_min = int(time.time() // 60)
    scores: List[float] = []
    rpm_series: List[Dict[str, Any]] = []

    try:
        redis = get_redis()
        # 1. Status Code Breakdown
        pipe = redis.pipeline()
        pipe.get("telemetry:total_requests")
        pipe.get("telemetry:total_errors")
        pipe.get("telemetry:status:2xx")
        pipe.get("telemetry:status:3xx")
        pipe.get("telemetry:status:4xx")
        pipe.get("telemetry:status:5xx")
        results = await asyncio.wait_for(pipe.execute(), timeout=0.25)

        total_reqs = int(results[0] or 0)
        total_errs = int(results[1] or 0)
        status_2xx = int(results[2] or 0)
        status_3xx = int(results[3] or 0)
        status_4xx = int(results[4] or 0)
        status_5xx = int(results[5] or 0)

        # 2. Latency Percentiles from sorted set
        latencies = await asyncio.wait_for(
            redis.zrangebyscore("telemetry:latencies", "-inf", "+inf", withscores=True),
            timeout=0.25
        )
        scores = [score for _, score in latencies]

        # 3. RPM Time-Series (Last 30 minutes)
        pipe = redis.pipeline()
        minute_keys = [f"telemetry:rpm:{curr_min - i}" for i in range(29, -1, -1)]
        for k in minute_keys:
            pipe.get(k)
        rpm_vals = await asyncio.wait_for(pipe.execute(), timeout=0.25)

        for i, val in enumerate(rpm_vals):
            min_ts = (curr_min - 29 + i) * 60
            rpm_series.append({
                "time": datetime.fromtimestamp(min_ts, tz=timezone.utc).strftime("%H:%M"),
                "rpm": int(val or 0),
            })
        redis_available = True
    except Exception:
        # Fallback to in-memory telemetry structures when Redis is offline
        total_reqs = in_memory_counters["total_requests"]
        total_errs = in_memory_counters["total_errors"]
        status_2xx = in_memory_counters["2xx"]
        status_3xx = in_memory_counters["3xx"]
        status_4xx = in_memory_counters["4xx"]
        status_5xx = in_memory_counters["5xx"]
        scores = list(in_memory_latencies)

        for i in range(29, -1, -1):
            m = curr_min - i
            min_ts = m * 60
            rpm_series.append({
                "time": datetime.fromtimestamp(min_ts, tz=timezone.utc).strftime("%H:%M"),
                "rpm": in_memory_rpm.get(m, 0),
            })

    error_rate = round((total_errs / total_reqs * 100), 2) if total_reqs > 0 else 0.0

    scores.sort()
    p50, p90, p95, p99, avg_lat = 0.0, 0.0, 0.0, 0.0, 0.0
    if scores:
        n = len(scores)
        p50 = round(scores[int(n * 0.50)], 2)
        p90 = round(scores[int(n * 0.90)], 2)
        p95 = round(scores[int(n * 0.95)], 2)
        p99 = round(scores[min(int(n * 0.99), n - 1)], 2)
        avg_lat = round(sum(scores) / n, 2)

    return {
        "ok": True,
        "redis_connected": redis_available,
        "summary": {
            "total_requests": total_reqs,
            "total_errors": total_errs,
            "error_rate_pct": error_rate,
            "status_distribution": {
                "2xx": status_2xx,
                "3xx": status_3xx,
                "4xx": status_4xx,
                "5xx": status_5xx,
            }
        },
        "latencies_ms": {
            "p50": p50,
            "p90": p90,
            "p95": p95,
            "p99": p99,
            "avg": avg_lat,
            "sample_size": len(scores),
        },
        "throughput_series": rpm_series,
    }

# ── 4. Live Request Debugger & Traceback Explorer ──

@router.get("/logs")
async def get_debug_logs(
    status_filter: str = Query(default="all", pattern="^(all|2xx|4xx|5xx|errors)$"),
    min_duration: float = Query(default=0.0, ge=0.0),
    path_search: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=200),
    token: str = Depends(require_developer_session)
):
    """
    Returns the real-time sliding-window request ring buffer.
    Contains full request context and complete Python stack traces for 500 errors.
    """
    raw_entries = []
    try:
        redis = get_redis()
        raw_entries = await asyncio.wait_for(
            redis.lrange("telemetry:recent_requests", 0, limit * 2),
            timeout=0.25
        )
    except Exception:
        pass

    logs = []
    # If Redis had entries, use those; otherwise use in-memory ring buffer
    candidate_items = []
    if raw_entries:
        for raw in raw_entries:
            try:
                candidate_items.append(orjson.loads(raw))
            except Exception:
                pass
    else:
        candidate_items = list(in_memory_logs)

    for item in candidate_items:
        try:
            status_code = item.get("status", 200)

            # Apply Status Filter
            if status_filter == "2xx" and not (200 <= status_code < 300):
                continue
            elif status_filter == "4xx" and not (400 <= status_code < 500):
                continue
            elif status_filter == "5xx" and status_code < 500:
                continue
            elif status_filter == "errors" and status_code < 400:
                continue

            # Apply Duration Filter
            if item.get("duration_ms", 0.0) < min_duration:
                continue

            # Apply Path Substring Search
            if path_search and path_search.lower() not in item.get("path", "").lower():
                continue

            logs.append(item)
            if len(logs) >= limit:
                break
        except Exception:
            continue

    return {
        "ok": True,
        "count": len(logs),
        "logs": logs,
    }

@router.post("/logs/clear")
async def clear_debug_logs(token: str = Depends(require_developer_session)):
    try:
        redis = get_redis()
        await asyncio.wait_for(redis.delete("telemetry:recent_requests"), timeout=0.25)
    except Exception:
        pass
    in_memory_logs.clear()
    return {"ok": True, "message": "Telemetry log buffer cleared."}

# ── 5. Dynamic API Key Management ──

@router.get("/api-keys")
async def list_api_keys(
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """List all API keys with live hit counts and last used timestamps."""
    stmt = select(ApiKey).order_by(ApiKey.created_at.desc())
    res = await db.execute(stmt)
    keys = res.scalars().all()

    results = []
    for k in keys:
        d = k.to_dict()
        # Merge live hit stats from Redis if available
        try:
            redis = get_redis()
            live_hits = await asyncio.wait_for(redis.get(f"apikey:stats:{k.id}:hits"), timeout=0.1)
            live_last = await asyncio.wait_for(redis.get(f"apikey:stats:{k.id}:last_used"), timeout=0.1)
            if live_hits:
                d["total_requests"] = k.total_requests + int(live_hits)
            if live_last:
                d["last_used_at"] = datetime.fromtimestamp(int(live_last), tz=timezone.utc).isoformat()
        except Exception:
            pass
        results.append(d)

    return {"ok": True, "api_keys": results}

@router.post("/api-keys")
async def create_api_key(
    payload: ApiKeyCreateRequest,
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new API key for any frontend.
    Returns the raw secret key ONCE. It is never displayed again.
    """
    prefix = settings.API_KEY_PREFIX_TEST if payload.environment == "test" else settings.API_KEY_PREFIX_LIVE
    secret = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{secret}"

    key_prefix = raw_key[:12]
    last_four = raw_key[-4:]
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    new_key = ApiKey(
        name=payload.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        last_four=last_four,
        environment=payload.environment,
        scopes=payload.scopes or ["*"],
        rate_limit_per_minute=payload.rate_limit_per_minute,
        allowed_origins=payload.allowed_origins or ["*"],
        is_active=True,
    )
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    return {
        "ok": True,
        "message": "API key generated successfully. Store this secret key securely; it cannot be viewed again.",
        "api_key": {
            "id": new_key.id,
            "name": new_key.name,
            "raw_key": raw_key,  # Revealed once
            "key_prefix": new_key.key_prefix,
            "last_four": new_key.last_four,
            "environment": new_key.environment,
            "scopes": new_key.scopes,
            "rate_limit_per_minute": new_key.rate_limit_per_minute,
            "allowed_origins": new_key.allowed_origins,
            "created_at": new_key.created_at.isoformat(),
        }
    }

@router.patch("/api-keys/{key_id}")
async def update_api_key(
    key_id: int,
    payload: ApiKeyUpdateRequest,
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """Update API key properties and immediately invalidate Redis cache."""
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    res = await db.execute(stmt)
    key_obj = res.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="API key not found")

    if payload.name is not None:
        key_obj.name = payload.name
    if payload.is_active is not None:
        key_obj.is_active = payload.is_active
    if payload.scopes is not None:
        key_obj.scopes = payload.scopes
    if payload.rate_limit_per_minute is not None:
        key_obj.rate_limit_per_minute = payload.rate_limit_per_minute
    if payload.allowed_origins is not None:
        key_obj.allowed_origins = payload.allowed_origins

    await db.commit()
    await db.refresh(key_obj)

    # Invalidate Redis cache
    await cache_delete(f"apikey:{key_obj.key_hash}")

    return {"ok": True, "api_key": key_obj.to_dict()}

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """Revoke and delete an API key permanently."""
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    res = await db.execute(stmt)
    key_obj = res.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="API key not found")

    # Invalidate cache
    await cache_delete(f"apikey:{key_obj.key_hash}")

    await db.delete(key_obj)
    await db.commit()
    return {"ok": True, "message": f"API key '{key_obj.name}' deleted successfully."}

@router.post("/api-keys/{key_id}/roll")
async def roll_api_key(
    key_id: int,
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """Roll and regenerate the secret token for an existing API Key."""
    stmt = select(ApiKey).where(ApiKey.id == key_id)
    res = await db.execute(stmt)
    key_obj = res.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="API key not found")

    # Invalidate old cache
    await cache_delete(f"apikey:{key_obj.key_hash}")

    prefix = settings.API_KEY_PREFIX_TEST if key_obj.environment == "test" else settings.API_KEY_PREFIX_LIVE
    secret = secrets.token_urlsafe(32)
    raw_key = f"{prefix}{secret}"

    key_obj.key_prefix = raw_key[:12]
    key_obj.last_four = raw_key[-4:]
    key_obj.key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    await db.commit()
    await db.refresh(key_obj)

    return {
        "ok": True,
        "message": "API key rolled successfully. Old secret is immediately revoked.",
        "api_key": {
            "id": key_obj.id,
            "name": key_obj.name,
            "raw_key": raw_key,  # New secret revealed once
            "key_prefix": key_obj.key_prefix,
            "last_four": key_obj.last_four,
        }
    }

# ── Phase 1 & 2 Endpoints ──

@router.get("/crm-stats")
async def get_crm_stats(token: str = Depends(require_developer_session), db: AsyncSession = Depends(get_db)):
    leads_data = {"total": 0, "today": 0, "this_week": 0, "by_stage": [], "pipeline_value": 0}
    clients_data = {"total": 0}
    estimates_data = {"total": 0, "by_status": []}
    sessions_data = {"active": 0}
    calendar_data = {"events_this_week": 0}
    tasks_data = {"pending": 0}

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM leads"))
        leads_data["total"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM leads WHERE created_at >= date_trunc('day', NOW())"))
        leads_data["today"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM leads WHERE created_at >= date_trunc('week', NOW())"))
        leads_data["this_week"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT pipeline_stage, COUNT(*) FROM leads GROUP BY pipeline_stage"))
        leads_data["by_stage"] = [{"stage": row[0], "count": row[1]} for row in res.fetchall()]
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COALESCE(SUM(estimated_value), 0) FROM leads WHERE pipeline_stage NOT IN ('lost', 'closed_lost')"))
        leads_data["pipeline_value"] = float(res.scalar() or 0)
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM clients"))
        clients_data["total"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM estimates"))
        estimates_data["total"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT status, COUNT(*) FROM estimates GROUP BY status"))
        estimates_data["by_status"] = [{"status": row[0], "count": row[1]} for row in res.fetchall()]
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM admin_sessions WHERE expires_at > NOW()"))
        sessions_data["active"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM crm_calendar_events WHERE start_time >= date_trunc('week', NOW()) AND start_time < date_trunc('week', NOW()) + interval '7 days'"))
        calendar_data["events_this_week"] = res.scalar() or 0
    except Exception:
        pass

    try:
        res = await db.execute(text("SELECT COUNT(*) FROM tasks WHERE completed_at IS NULL"))
        tasks_data["pending"] = res.scalar() or 0
    except Exception:
        pass

    return {
        "ok": True,
        "leads": leads_data,
        "clients": clients_data,
        "estimates": estimates_data,
        "sessions": sessions_data,
        "calendar": calendar_data,
        "tasks": tasks_data,
    }

@router.get("/errors")
async def get_error_groups(token: str = Depends(require_developer_session)):
    candidate_items = list(in_memory_logs)
    
    try:
        redis = get_redis()
        raw_entries = await asyncio.wait_for(redis.lrange("telemetry:recent_requests", 0, -1), timeout=0.25)
        for raw in raw_entries:
            try:
                candidate_items.append(orjson.loads(raw))
            except Exception:
                pass
    except Exception:
        pass
    
    groups = {}
    for item in candidate_items:
        status_code = item.get("status", 200)
        if status_code >= 400:
            path = item.get("path", "unknown")
            err_msg = item.get("error_message", "Unknown error")
            first_line = err_msg.split("\\n")[0] if err_msg else "Unknown error"
            key = (path, status_code, first_line)
            
            if key not in groups:
                groups[key] = {
                    "path": path,
                    "status": status_code,
                    "error_message_first_line": first_line,
                    "count": 0,
                    "first_seen": item.get("timestamp"),
                    "last_seen": item.get("timestamp"),
                    "sample_traceback": item.get("error_traceback"),
                    "sample_request": {
                        "method": item.get("method"),
                        "query": item.get("query"),
                        "client": item.get("client")
                    }
                }
            
            groups[key]["count"] += 1
            
            t1 = groups[key]["first_seen"]
            t2 = groups[key]["last_seen"]
            cur_t = item.get("timestamp")
            if cur_t:
                if not t1 or cur_t < t1:
                    groups[key]["first_seen"] = cur_t
                if not t2 or cur_t > t2:
                    groups[key]["last_seen"] = cur_t

    error_groups = sorted(list(groups.values()), key=lambda x: x["count"], reverse=True)
    return {"ok": True, "error_groups": error_groups}

@router.post("/errors/clear")
async def clear_errors(token: str = Depends(require_developer_session)):
    try:
        redis = get_redis()
        await asyncio.wait_for(redis.delete("telemetry:recent_requests"), timeout=0.25)
    except Exception:
        pass
    in_memory_logs.clear()
    return {"ok": True, "message": "Error tracking cleared."}

@router.get("/sessions")
async def get_active_sessions(token: str = Depends(require_developer_session), db: AsyncSession = Depends(get_db)):
    admin_sessions = []
    try:
        query = text("""
            SELECT s.id, s.token, s.user_id, s.created_at, s.expires_at, s.ip_address, s.user_agent,
                   u.name, u.email, u.role
            FROM admin_sessions s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > NOW()
            ORDER BY s.created_at DESC
        """)
        res = await db.execute(query)
        for row in res.fetchall():
            token_val = row[1]
            masked_token = (token_val[:8] + "..." + token_val[-4:]) if token_val and len(token_val) >= 12 else (token_val or "")
            admin_sessions.append({
                "id": row[0],
                "token": masked_token,
                "user_id": row[2],
                "created_at": row[3].isoformat() if row[3] else None,
                "expires_at": row[4].isoformat() if row[4] else None,
                "ip_address": row[5],
                "user_agent": row[6],
                "user_name": row[7],
                "user_email": row[8],
                "user_role": row[9]
            })
    except Exception:
        pass
    
    dev_count = 0
    try:
        redis = get_redis()
        keys = await asyncio.wait_for(redis.keys("dev_session:*"), timeout=0.25)
        dev_count = len(keys)
    except Exception:
        pass

    return {"ok": True, "admin_sessions": admin_sessions, "developer_sessions_count": dev_count}

@router.delete("/sessions/{session_id}")
async def kill_session(session_id: int, token: str = Depends(require_developer_session), db: AsyncSession = Depends(get_db)):
    try:
        res = await db.execute(text("SELECT token FROM admin_sessions WHERE id = :id"), {"id": session_id})
        session_token = res.scalar()
        if session_token:
            redis = get_redis()
            await asyncio.wait_for(redis.delete(f"session_user:{session_token}"), timeout=0.25)
            
        await db.execute(text("DELETE FROM admin_sessions WHERE id = :id"), {"id": session_id})
        await db.commit()
    except Exception:
        pass
    return {"ok": True, "message": "Session killed."}

@router.get("/database/overview")
async def get_database_overview(token: str = Depends(require_developer_session), db: AsyncSession = Depends(get_db)):
    result = {
        "ok": True,
        "database_size": "0 B",
        "database_size_bytes": 0,
        "tables": [],
        "active_connections": [],
        "index_stats": [],
    }
    try:
        # Total DB size
        res = await db.execute(text("SELECT pg_database_size(current_database())"))
        size_bytes = res.scalar() or 0
        result["database_size_bytes"] = size_bytes
        # Format human-readable
        if size_bytes >= 1073741824:
            result["database_size"] = f"{size_bytes / 1073741824:.1f} GB"
        elif size_bytes >= 1048576:
            result["database_size"] = f"{size_bytes / 1048576:.1f} MB"
        elif size_bytes >= 1024:
            result["database_size"] = f"{size_bytes / 1024:.1f} KB"
        else:
            result["database_size"] = f"{size_bytes} B"
    except Exception:
        pass

    try:
        # Table stats + sizes merged
        res = await db.execute(text("""
            SELECT 
                s.relname as table_name,
                s.n_live_tup as live_tuples,
                s.n_dead_tup as dead_tuples,
                s.last_vacuum,
                s.last_autovacuum,
                s.last_analyze,
                pg_total_relation_size(s.schemaname||'.'||s.relname) as size_bytes
            FROM pg_stat_user_tables s
            WHERE s.schemaname = 'public'
            ORDER BY s.n_live_tup DESC
        """))
        tables = []
        for row in res.fetchall():
            r = dict(row._mapping)
            # Convert datetimes to strings
            for key in ("last_vacuum", "last_autovacuum", "last_analyze"):
                if r.get(key):
                    r[key] = r[key].isoformat() if hasattr(r[key], 'isoformat') else str(r[key])
                else:
                    r[key] = None
            # Format size
            sb = r.get("size_bytes", 0) or 0
            if sb >= 1048576:
                r["size"] = f"{sb / 1048576:.1f} MB"
            elif sb >= 1024:
                r["size"] = f"{sb / 1024:.1f} KB"
            else:
                r["size"] = f"{sb} B"
            tables.append(r)
        result["tables"] = tables
    except Exception:
        pass

    try:
        # Active connections
        res = await db.execute(text("""
            SELECT pid, state, wait_event_type, query, usename, client_addr,
                   EXTRACT(EPOCH FROM (now() - backend_start))::int as duration_seconds
            FROM pg_stat_activity 
            WHERE datname = current_database() AND pid != pg_backend_pid()
            ORDER BY backend_start DESC
        """))
        conns = []
        for row in res.fetchall():
            r = dict(row._mapping)
            r["client_addr"] = str(r.get("client_addr") or "local")
            r["query"] = (r.get("query") or "")[:200]
            conns.append(r)
        result["active_connections"] = conns
    except Exception:
        pass

    try:
        # Index stats
        res = await db.execute(text("""
            SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch, 
                   pg_relation_size(indexrelid) as size 
            FROM pg_stat_user_indexes 
            ORDER BY idx_scan ASC LIMIT 20
        """))
        result["index_stats"] = [dict(row._mapping) for row in res.fetchall()]
    except Exception:
        pass

    return result

@router.get("/environment")
async def get_environment_info(token: str = Depends(require_developer_session)):
    info = {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "fastapi_version": "unknown",
        "sqlalchemy_version": "unknown",
        "process_uptime_seconds": 0,
        "disk_usage": {},
        "hostname": platform.node(),
        "cors_origins": getattr(settings, "CORS_ORIGINS", []),
        "environment": getattr(settings, "ENVIRONMENT", "unknown"),
        "database_host": "unknown",
        "redis_url": "unknown"
    }

    try:
        info["fastapi_version"] = importlib.metadata.version('fastapi')
    except Exception:
        pass

    try:
        info["sqlalchemy_version"] = importlib.metadata.version('sqlalchemy')
    except Exception:
        pass

    try:
        info["process_uptime_seconds"] = time.time() - psutil.Process().create_time()
    except Exception:
        pass

    try:
        usage = shutil.disk_usage('/')
        info["disk_usage"] = {
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
            "percent": round(usage.used / usage.total * 100, 2) if usage.total > 0 else 0
        }
    except Exception:
        pass
    
    try:
        db_url = str(getattr(settings, "DATABASE_URL", ""))
        if "@" in db_url:
            creds, rest = db_url.split("@", 1)
            prefix = creds.split("://")[0] + "://"
            user = creds.split("://")[1].split(":")[0]
            info["database_host"] = f"{prefix}{user}:***@{rest}"
        else:
            info["database_host"] = db_url
    except Exception:
        pass

    try:
        redis_url = str(getattr(settings, "REDIS_URL", ""))
        if "@" in redis_url:
            creds, rest = redis_url.split("@", 1)
            prefix = creds.split("://")[0] + "://"
            if ":" in creds.split("://")[1]:
                user = creds.split("://")[1].split(":")[0]
                info["redis_url"] = f"{prefix}{user}:***@{rest}"
            else:
                info["redis_url"] = f"{prefix}***@{rest}"
        else:
            info["redis_url"] = redis_url
    except Exception:
        pass

    return {"ok": True, "environment": info}

@router.get("/audit-logs")
async def get_developer_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    try:
        where_clauses = []
        params = {"limit": limit, "offset": offset}

        if action:
            where_clauses.append("a.action = :action")
            params["action"] = action
        if user_id:
            where_clauses.append("a.user_id = :user_id")
            params["user_id"] = user_id
        if entity_type:
            where_clauses.append("a.entity_type = :entity_type")
            params["entity_type"] = entity_type

        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)

        query = f"""
            SELECT a.*, u.name as user_name, u.email as user_email 
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            {where_sql}
            ORDER BY a.created_at DESC 
            LIMIT :limit OFFSET :offset
        """
        
        count_query = f"SELECT COUNT(*) FROM audit_logs a {where_sql}"
        
        res = await db.execute(text(query), params)
        rows = [dict(row._mapping) for row in res.fetchall()]
        
        # Convert datetimes to strings if needed
        for r in rows:
            if r.get("created_at"):
                r["created_at"] = r["created_at"].isoformat()

        count_res = await db.execute(text(count_query), params)
        total = count_res.scalar() or 0

        return {"ok": True, "audit_logs": rows, "total": total}
    except Exception:
        return {"ok": True, "audit_logs": [], "total": 0, "note": "audit_logs table not found"}

@router.get("/integrations")
async def get_integration_status(
    token: str = Depends(require_developer_session)
):
    """Returns static integration config status without making outbound API requests to avoid wasting third-party quotas."""
    integrations = {}

    # Google Business
    google_configured = bool(getattr(settings, "GOOGLE_CLIENT_ID", None) and getattr(settings, "GOOGLE_CLIENT_SECRET", None))
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    prefix = client_id[:6] + "..." if client_id else ""
    integrations["google_business"] = {
        "configured": google_configured,
        "status": "configured" if google_configured else "not_configured",
        "client_id_prefix": prefix
    }

    # Yelp - pure config check, zero external calls to preserve quota
    yelp_key = getattr(settings, "YELP_API_KEY", None)
    yelp_configured = bool(yelp_key)
    integrations["yelp"] = {
        "configured": yelp_configured,
        "status": "configured" if yelp_configured else "not_configured",
        "business_id": getattr(settings, "YELP_BUSINESS_ID", "configured" if yelp_configured else "none")
    }

    # Weather API - pure config check, zero external calls to preserve quota
    weather_key = getattr(settings, "WEATHER_API_KEY", None)
    weather_configured = bool(weather_key)
    integrations["weather"] = {
        "configured": weather_configured,
        "status": "configured" if weather_configured else "not_configured"
    }

    # Resend Email
    resend_key = getattr(settings, "RESEND_API_KEY", None)
    resend_configured = bool(resend_key)
    integrations["resend_email"] = {
        "configured": resend_configured,
        "status": "configured" if resend_configured else "not_configured"
    }

    # S3 / MinIO
    s3_endpoint = getattr(settings, "S3_ENDPOINT_URL", None)
    s3_configured = bool(s3_endpoint)
    integrations["s3_storage"] = {
        "configured": s3_configured,
        "status": "configured" if s3_configured else "not_configured",
        "endpoint": s3_endpoint
    }

    return {"ok": True, "integrations": integrations}

class SqlQueryRequest(BaseModel):
    sql: str = Field(..., max_length=2000)

@router.post("/tools/query")
async def execute_readonly_query(
    payload: SqlQueryRequest,
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Arbitrary SQL execution is permanently disabled for platform security and compliance.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Arbitrary SQL execution endpoint is permanently disabled for platform security."
    )

@router.get("/tools/redis-keys")
async def browse_redis_keys(
    pattern: str = Query(default="*", max_length=200),
    limit: int = Query(default=50, ge=1, le=200),
    token: str = Depends(require_developer_session)
):
    try:
        redis = get_redis()
        keys_list = []
        cursor, scanned_keys = await asyncio.wait_for(redis.scan(match=pattern, count=limit), timeout=0.25)
        for key in scanned_keys[:limit]:
            key_str = key.decode("utf-8") if isinstance(key, bytes) else str(key)
            k_type = await asyncio.wait_for(redis.type(key), timeout=0.25)
            k_type_str = k_type.decode("utf-8") if isinstance(k_type, bytes) else str(k_type)
            k_ttl = await asyncio.wait_for(redis.ttl(key), timeout=0.25)
            
            preview = ""
            if k_type_str == "string":
                val = await asyncio.wait_for(redis.get(key), timeout=0.25)
                val_str = val.decode("utf-8", errors="ignore") if isinstance(val, bytes) else str(val)
                preview = val_str[:200] + ("..." if len(val_str) > 200 else "")
            elif k_type_str == "list":
                llen = await asyncio.wait_for(redis.llen(key), timeout=0.25)
                preview = f"List with {llen} elements"
            elif k_type_str == "set":
                scard = await asyncio.wait_for(redis.scard(key), timeout=0.25)
                preview = f"Set with {scard} elements"
            elif k_type_str == "zset":
                zcard = await asyncio.wait_for(redis.zcard(key), timeout=0.25)
                preview = f"Sorted Set with {zcard} elements"
            elif k_type_str == "hash":
                hlen = await asyncio.wait_for(redis.hlen(key), timeout=0.25)
                preview = f"Hash with {hlen} fields"
                
            keys_list.append({"key": key_str, "type": k_type_str, "ttl": k_ttl, "preview": preview})
            
        return {"ok": True, "keys": keys_list, "total_scanned": len(scanned_keys)}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@router.post("/tools/health-check-all")
async def health_check_all(
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    async def check_postgres():
        try:
            t0 = time.perf_counter()
            await db.execute(text("SELECT 1"))
            return {"status": "ok", "ping_ms": round((time.perf_counter() - t0) * 1000, 2)}
        except Exception as e:
            return {"status": f"error: {str(e)}"}
            
    async def check_redis():
        try:
            redis = get_redis()
            t0 = time.perf_counter()
            await asyncio.wait_for(redis.ping(), timeout=0.25)
            return {"status": "ok", "ping_ms": round((time.perf_counter() - t0) * 1000, 2)}
        except Exception as e:
            return {"status": f"error: {str(e)}"}
            
    async def check_s3():
        try:
            return {"status": "ok" if settings.S3_ENDPOINT_URL else "unconfigured"}
        except Exception as e:
            return {"status": f"error: {str(e)}"}
            
    async def check_memory():
        try:
            return {"status": "ok", "rss_mb": round(psutil.Process().memory_info().rss / (1024 * 1024), 2)}
        except Exception as e:
            return {"status": f"error: {str(e)}"}

    pg_res, redis_res, s3_res, mem_res = await asyncio.gather(
        check_postgres(), check_redis(), check_s3(), check_memory(), return_exceptions=True
    )

    return {
        "ok": True,
        "services": {
            "postgres": pg_res if not isinstance(pg_res, Exception) else {"status": str(pg_res)},
            "redis": redis_res if not isinstance(redis_res, Exception) else {"status": str(redis_res)},
            "s3": s3_res if not isinstance(s3_res, Exception) else {"status": str(s3_res)},
            "memory": mem_res if not isinstance(mem_res, Exception) else {"status": str(mem_res)},
        }
    }

@router.post("/tools/reset-telemetry")
async def reset_telemetry(token: str = Depends(require_developer_session)):
    try:
        in_memory_counters["total_requests"] = 0
        in_memory_counters["total_errors"] = 0
        in_memory_counters["2xx"] = 0
        in_memory_counters["3xx"] = 0
        in_memory_counters["4xx"] = 0
        in_memory_counters["5xx"] = 0
        in_memory_rpm.clear()
        in_memory_latencies.clear()

        try:
            redis = get_redis()
            keys_to_delete = []
            for pattern in ["telemetry:status:*", "telemetry:total_*", "telemetry:rpm:*", "telemetry:latencies"]:
                cursor, keys = await asyncio.wait_for(redis.scan(match=pattern, count=1000), timeout=0.25)
                keys_to_delete.extend(keys)
            
            if keys_to_delete:
                await asyncio.wait_for(redis.delete(*keys_to_delete), timeout=0.5)
        except Exception:
            pass

        return {"ok": True, "message": "Telemetry reset successfully"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# ── 6. Diagnostic & Health Tools ──

@router.post("/tools/ping-db")
async def ping_database(
    token: str = Depends(require_developer_session),
    db: AsyncSession = Depends(get_db)
):
    """Executes 5 consecutive SQL queries to measure minimum, maximum, and average database latency."""
    pings = []
    for _ in range(5):
        t0 = time.perf_counter()
        await db.execute(text("SELECT 1"))
        pings.append(round((time.perf_counter() - t0) * 1000, 2))

    return {
        "ok": True,
        "pings_ms": pings,
        "avg_ms": round(sum(pings) / len(pings), 2),
        "min_ms": min(pings),
        "max_ms": max(pings),
    }

@router.post("/tools/flush-cache")
async def flush_application_cache(token: str = Depends(require_developer_session)):
    """Flushes API keys and route caches without evicting developer sessions."""
    redis = get_redis()
    keys = await redis.keys("apikey:*")
    if keys:
        await redis.delete(*keys)
    return {"ok": True, "flushed_keys_count": len(keys)}
