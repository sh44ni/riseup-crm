import time
import uuid
import asyncio
import traceback
from collections import deque
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import orjson

from app.core.redis import get_redis, is_redis_available

RING_BUFFER_KEY = "telemetry:recent_requests"
RING_BUFFER_LIMIT = 200

# ── In-Memory Telemetry Ring Buffer & Counters (Graceful Offline Fallback) ──
in_memory_logs: deque = deque(maxlen=200)
in_memory_counters: Dict[str, int] = {
    "total_requests": 0,
    "total_errors": 0,
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
}
in_memory_latencies: deque = deque(maxlen=1000)
in_memory_rpm: Dict[int, int] = {}

async def _flush_telemetry_to_redis(
    log_entry: dict,
    cat: str,
    epoch_min: int,
    duration_ms: float,
    status_code: int,
) -> None:
    """Fire-and-forget Redis telemetry flush. Runs as a background task."""
    if not await is_redis_available():
        return
    try:
        r = get_redis()
        pipe = r.pipeline()
        pipe.lpush(RING_BUFFER_KEY, orjson.dumps(log_entry).decode("utf-8"))
        pipe.ltrim(RING_BUFFER_KEY, 0, RING_BUFFER_LIMIT - 1)
        pipe.incr(f"telemetry:status:{cat}")
        pipe.incr("telemetry:total_requests")
        if status_code >= 400:
            pipe.incr("telemetry:total_errors")
        pipe.incr(f"telemetry:rpm:{epoch_min}")
        pipe.expire(f"telemetry:rpm:{epoch_min}", 7200)
        pipe.zadd("telemetry:latencies", {f"{log_entry['id']}:{duration_ms}": duration_ms})
        pipe.zremrangebyrank("telemetry:latencies", 0, -1001)
        await asyncio.wait_for(pipe.execute(), timeout=0.15)
    except Exception:
        pass

class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Don't capture telemetry on internal health checks or developer log polling to avoid noise
        path = request.url.path
        is_internal_poll = path in ["/health", "/api/developer/logs", "/api/developer/status", "/api/developer/metrics"]

        # Extract Client IP
        client_ip = (
            request.headers.get("cf-connecting-ip")
            or request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        # Detect Auth Type
        auth_info = "anonymous"
        if "x-api-key" in request.headers:
            auth_info = "api_key"
        elif request.headers.get("authorization", "").startswith("Bearer rup_"):
            auth_info = "api_key"
        elif "admin_session" in request.cookies:
            auth_info = "admin_session"
        elif "dev_session" in request.cookies:
            auth_info = "developer"

        status_code = 500
        error_msg: Optional[str] = None
        tb_str: Optional[str] = None
        response: Optional[Response] = None
        unhandled_exc: Optional[Exception] = None
        request.state.request_id = req_id

        from app.core.logging import request_id_ctx
        request_id_ctx.set(req_id)

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            # Recorded for operators only; never sent to the client.
            tb_str = traceback.format_exc()
            error_msg = str(exc)
            status_code = 500
            unhandled_exc = exc

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        if response is not None:
            response.headers["X-Process-Time"] = f"{duration_ms}ms"
            response.headers["X-Request-Id"] = req_id

        # Skip recording for high-frequency internal telemetry endpoints to keep log clean
        if not is_internal_poll:
            cat = "2xx" if status_code < 300 else ("3xx" if status_code < 400 else ("4xx" if status_code < 500 else "5xx"))
            log_entry = {
                "id": req_id,
                "timestamp": timestamp,
                "method": request.method,
                "path": path,
                "query": str(request.query_params),
                "status": status_code,
                "duration_ms": duration_ms,
                "client_ip": client_ip,
                "user_agent": request.headers.get("user-agent", "")[:120],
                "auth_info": auth_info,
                "error": error_msg,
                "traceback": tb_str,
            }

            # 1. Always record in-memory immediately (< 0.005ms, never fails)
            in_memory_logs.appendleft(log_entry)
            in_memory_counters["total_requests"] += 1
            in_memory_counters[cat] += 1
            if status_code >= 400:
                in_memory_counters["total_errors"] += 1
            in_memory_latencies.append(duration_ms)
            epoch_min = int(time.time() // 60)
            in_memory_rpm[epoch_min] = in_memory_rpm.get(epoch_min, 0) + 1

            # Clean old RPM entries — only when dict exceeds max expected size
            if len(in_memory_rpm) > 125:  # 2 hours of minutes + buffer
                cutoff_min = epoch_min - 120
                for k in [k for k in list(in_memory_rpm.keys()) if k < cutoff_min]:
                    in_memory_rpm.pop(k, None)

            # 2. Fire-and-forget Redis write (never delays the response)
            asyncio.create_task(
                _flush_telemetry_to_redis(log_entry, cat, epoch_min, duration_ms, status_code)
            )

        if unhandled_exc is not None:
            raise unhandled_exc

        return response
