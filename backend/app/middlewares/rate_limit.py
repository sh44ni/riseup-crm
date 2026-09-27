from typing import Callable
from fastapi import Request, HTTPException, status
from app.core.redis import check_rate_limit
from app.core.audit import get_client_ip

def rate_limit(namespace: str, limit: int, window_seconds: int) -> Callable:
    """
    FastAPI dependency enforcing sliding-window rate limit per client IP via Redis.
    """
    async def dependency(request: Request) -> None:
        client_ip = get_client_ip(request)
        allowed, remaining, reset_sec = await check_rate_limit(
            namespace=namespace,
            identifier=client_ip,
            limit=limit,
            window_seconds=window_seconds
        )

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {reset_sec} seconds.",
                headers={"Retry-After": str(reset_sec)}
            )
    return dependency
