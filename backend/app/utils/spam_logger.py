import json
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.logger import get_logger
from app.utils.spam import SpamAttemptRecord

logger = get_logger(__name__)

async def log_spam_attempt(db: AsyncSession, record: SpamAttemptRecord) -> None:
    """
    Safely logs a blocked spam/bot attempt to the isolated spam_attempts table.
    Non-blocking / failsafe: catches any DB error so the silent tarpit response (200 OK)
    is never interrupted or failed.
    """
    try:
        # Sanitize payload snapshot for JSON storage (remove giant or circular fields if any)
        clean_snapshot = None
        if record.payload_snapshot and isinstance(record.payload_snapshot, dict):
            # Exclude large or sensitive keys if any
            clean_snapshot = {
                k: str(v)[:500] if not isinstance(v, (int, float, bool, type(None))) else v
                for k, v in record.payload_snapshot.items()
                if k not in ("turnstileToken", "turnstile_token", "cf-turnstile-response")
            }
        
        payload_json = json.dumps(clean_snapshot) if clean_snapshot else None
        
        insert_sql = text("""
            INSERT INTO spam_attempts (
                block_reason, block_detail, form_type, ip_address,
                user_agent, page_referer, payload_snapshot, submitted_at
            ) VALUES (
                :block_reason, :block_detail, :form_type, :ip_address,
                :user_agent, :page_referer, :payload_snapshot, NOW()
            )
        """)
        
        await db.execute(insert_sql, {
            "block_reason": record.block_reason,
            "block_detail": record.block_detail,
            "form_type": record.form_type,
            "ip_address": record.ip_address,
            "user_agent": (record.user_agent[:500] if record.user_agent else None),
            "page_referer": (record.page_referer[:500] if record.page_referer else None),
            "payload_snapshot": payload_json,
        })
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to record spam attempt log: {e}")
