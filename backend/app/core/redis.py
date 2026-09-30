import time
import asyncio
from typing import Optional, Tuple, Any, Dict, List
import redis.asyncio as redis
from app.core.config import settings

# Global async Redis client
redis_client: Optional[redis.Redis] = None
_rate_limit_script = None

# Availability tracker and ultra-fast in-memory fallback structures
_redis_available: Optional[bool] = None
_last_redis_check: float = 0.0
_in_memory_cache: Dict[str, Tuple[str, float]] = {}
_in_memory_rate_limits: Dict[str, List[float]] = {}
_purge_task: Optional[asyncio.Task] = None

# Atomic sliding window rate limiter Lua script
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local clear_before = now - window_ms

redis.call('ZREMRANGEBYSCORE', key, 0, clear_before)
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('PEXPIRE', key, window_ms)
    return {1, limit - current_requests - 1, window_ms}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local reset_ms = window_ms
    if oldest and #oldest >= 2 then
        reset_ms = math.max(0, math.floor(tonumber(oldest[2]) + window_ms - now))
    end
    return {0, 0, reset_ms}
end
"""

async def _purge_stale_in_memory(interval_seconds: int = 300) -> None:
    """Background coroutine: purge expired entries from in-memory fallback dicts every 5 minutes."""
    while True:
        await asyncio.sleep(interval_seconds)
        now = time.time()

        # Purge expired cache entries
        stale_cache = [k for k, (_, exp) in list(_in_memory_cache.items()) if exp <= now]
        for k in stale_cache:
            _in_memory_cache.pop(k, None)

        # Purge rate limit keys where ALL timestamps are older than the max possible window (3600s)
        # Keys with still-valid timestamps are preserved
        MAX_WINDOW = 3600
        stale_rl = [
            k for k, ts_list in list(_in_memory_rate_limits.items())
            if not ts_list or (now - max(ts_list)) > MAX_WINDOW
        ]
        for k in stale_rl:
            _in_memory_rate_limits.pop(k, None)

def get_redis() -> redis.Redis:
    global redis_client, _rate_limit_script
    if redis_client is None:
        redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
            socket_connect_timeout=0.15,
            socket_timeout=0.15,
            retry_on_timeout=False,
        )
        _rate_limit_script = redis_client.register_script(SLIDING_WINDOW_LUA)
    return redis_client

async def is_redis_available() -> bool:
    global _redis_available, _last_redis_check
    now = time.time()
    if _redis_available is not None and (now - _last_redis_check) < 30.0:
        return _redis_available

    _last_redis_check = now
    try:
        client = get_redis()
        await asyncio.wait_for(client.ping(), timeout=0.08)
        _redis_available = True
    except Exception:
        _redis_available = False
    return _redis_available

async def init_redis() -> Optional[redis.Redis]:
    global redis_client, _redis_available, _purge_task
    try:
        await is_redis_available()
    except Exception:
        _redis_available = False

    # Start background in-memory purge task (only if not already running)
    if _purge_task is None or _purge_task.done():
        _purge_task = asyncio.create_task(_purge_stale_in_memory(300))

    return redis_client

async def close_redis() -> None:
    global redis_client, _redis_available, _purge_task
    # Cancel background purge task
    if _purge_task and not _purge_task.done():
        _purge_task.cancel()
        try:
            await _purge_task
        except asyncio.CancelledError:
            pass
        _purge_task = None

    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass
        redis_client = None
    _redis_available = None

async def check_rate_limit(
    namespace: str,
    identifier_or_limit: Any = None,
    limit_or_window: int = 60,
    window_seconds: Optional[int] = None,
    identifier: Any = None,
    limit: Optional[int] = None,
) -> Tuple[bool, int, int]:
    id_val = identifier if identifier is not None else identifier_or_limit
    effective_limit = limit if limit is not None else (limit_or_window if window_seconds is not None else identifier_or_limit)
    effective_window = window_seconds if window_seconds is not None else limit_or_window

    if id_val is None or (identifier is None and window_seconds is None):
        key = namespace if (namespace.startswith("ratelimit:") or namespace.startswith("rl:")) else f"ratelimit:{namespace}"
        final_limit = int(effective_limit or 60)
        final_window = int(effective_window or 60)
    else:
        key = f"ratelimit:{namespace}:{id_val}"
        final_limit = int(effective_limit or 60)
        final_window = int(effective_window or 60)

    now = time.time()
    now_ms = int(now * 1000)
    window_ms = final_window * 1000

    if await is_redis_available():
        try:
            client = get_redis()
            if _rate_limit_script:
                res = await _rate_limit_script(
                    keys=[key],
                    args=[window_ms, final_limit, now_ms]
                )
                allowed = bool(res[0] == 1)
                remaining = int(res[1])
                reset_seconds = max(1, int(res[2] / 1000))
                return allowed, remaining, reset_seconds
        except Exception:
            global _redis_available
            _redis_available = False

    # In-memory sliding-window fallback (< 0.005ms)
    timestamps = _in_memory_rate_limits.get(key, [])
    cutoff = now - final_window
    valid_ts = [t for t in timestamps if t > cutoff]
    if len(valid_ts) < final_limit:
        valid_ts.append(now)
        _in_memory_rate_limits[key] = valid_ts
        return True, final_limit - len(valid_ts), final_window
    else:
        _in_memory_rate_limits[key] = valid_ts
        earliest = valid_ts[0] if valid_ts else now
        reset_sec = max(1, int((earliest + final_window) - now))
        return False, 0, reset_sec

async def cache_get(key: str) -> Optional[str]:
    now = time.time()
    item = _in_memory_cache.get(key)
    if item:
        val, exp = item
        if exp > now:
            return val
        else:
            _in_memory_cache.pop(key, None)

    if await is_redis_available():
        try:
            client = get_redis()
            val = await client.get(key)
            if val:
                _in_memory_cache[key] = (val, now + 60)
            return val
        except Exception:
            global _redis_available
            _redis_available = False
            return None
    return None

async def cache_set(key: str, value: str, ttl_seconds: int = 300) -> None:
    now = time.time()
    _in_memory_cache[key] = (value, now + ttl_seconds)

    if await is_redis_available():
        try:
            client = get_redis()
            await client.set(key, value, ex=ttl_seconds)
        except Exception:
            global _redis_available
            _redis_available = False

async def cache_delete(key: str) -> None:
    _in_memory_cache.pop(key, None)
    if await is_redis_available():
        try:
            client = get_redis()
            await client.delete(key)
        except Exception:
            global _redis_available
            _redis_available = False

async def invalidate_session_cache() -> None:
    for k in list(_in_memory_cache.keys()):
        if k.startswith("session_user:"):
            _in_memory_cache.pop(k, None)

    if await is_redis_available():
        try:
            client = get_redis()
            batch: List[str] = []
            async for k in client.scan_iter(match="session_user:*", count=100):
                batch.append(k)
                if len(batch) >= 200:
                    await client.delete(*batch)
                    batch.clear()
            if batch:
                await client.delete(*batch)
        except Exception:
            global _redis_available
            _redis_available = False
