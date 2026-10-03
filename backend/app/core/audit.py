from app.core.logger import get_logger
from typing import Any, Dict, Optional, Union
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import orjson
logger = get_logger(__name__)

def get_client_ip(request: Optional[Request]) -> str:
    if not request:
        return "127.0.0.1"
    
    # Check edge headers first
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
        
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
        
    if request.client:
        return request.client.host
    return "127.0.0.1"

def get_user_agent(request: Optional[Request]) -> str:
    if not request:
        return ""
    return request.headers.get("user-agent", "")

async def record_audit_log(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: Union[str, int],
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
    actor_type: str = "user",
    actor_id: Optional[str] = None
) -> None:
    """
    Persists an immutable audit log record for security, tracking, and compliance.
    """
    ip_addr = get_client_ip(request)
    ua = get_user_agent(request)
    changes_json = orjson.dumps(changes).decode("utf-8") if changes else None

    # Auto-populate actor_id from user_id if not explicitly provided
    resolved_actor_id = str(actor_id) if actor_id is not None else (str(user_id) if user_id is not None else None)

    stmt = text("""
        INSERT INTO audit_logs (
            user_id, user_email, user_role, action, resource_type,
            resource_id, ip_address, user_agent, changes, actor_type, actor_id, created_at
        ) VALUES (
            :user_id, :user_email, :user_role, :action, :resource_type,
            :resource_id, :ip_address, :user_agent, CAST(:changes AS jsonb), :actor_type, :actor_id, NOW()
        )
    """)

    try:
        async with db.begin_nested():
            await db.execute(
                stmt,
                {
                    "user_id": user_id,
                    "user_email": user_email,
                    "user_role": user_role,
                    "action": action,
                    "resource_type": resource_type,
                    "resource_id": str(resource_id),
                    "ip_address": ip_addr,
                    "user_agent": ua,
                    "changes": changes_json,
                    "actor_type": actor_type,
                    "actor_id": resolved_actor_id,
                }
            )
    except Exception as e:
        # Non-blocking fallback: never crash main user flow if audit log insert encounters error
        logger.error(f"Failed to write audit log: {e}")
