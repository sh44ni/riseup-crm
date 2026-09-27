from datetime import datetime
from fastapi import APIRouter, Request, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.services.reviews import sync_google_reviews, sync_yelp_reviews

router = APIRouter(tags=["Cron"])

@router.get("/api/cron/sync-reviews")
async def cron_sync_reviews_endpoint(
    request: Request,
    secret: str = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    cron_secret = settings.CRON_SECRET
    if cron_secret:
        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization.split(" ")[1].strip()
        
        is_authorized = (auth_token == cron_secret) or (secret == cron_secret)
        if not is_authorized:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid cron secret")

    google_res = await sync_google_reviews(db)
    yelp_res = await sync_yelp_reviews(db)

    return {
        "ok": bool(google_res.get("ok") or yelp_res.get("ok")),
        "google": google_res,
        "yelp": yelp_res,
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/api/cron/sweep-pipeline-followups")
@router.get("/api/cron/sweep-pipeline-followups")
async def cron_sweep_pipeline_followups(
    request: Request,
    secret: str = None,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    cron_secret = settings.CRON_SECRET
    if cron_secret:
        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization.split(" ")[1].strip()
        is_authorized = (auth_token == cron_secret) or (secret == cron_secret)
        if not is_authorized:
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid cron secret")

    from sqlalchemy import text
    auto_transition_sql = text("""
        UPDATE leads
        SET pipeline_stage = 'follow_up',
            stage_entered_at = NOW(),
            follow_up_at = NOW() + INTERVAL '7 days',
            status = 'follow_up',
            notes = CASE 
                WHEN notes IS NULL OR notes = '' THEN '[48h Automated Rule]: Review window elapsed. Auto-moved from Estimate Sent to Active Follow-Up (7-day timer initialized).'
                ELSE notes || E'\\n\\n' || '[48h Automated Rule]: Review window elapsed. Auto-moved from Estimate Sent to Active Follow-Up (7-day timer initialized).'
            END,
            updated_at = NOW()
        WHERE status != 'purged' AND status != 'lost' AND status != 'won'
          AND contract_signed_at IS NULL
          AND (
              pipeline_stage = 'estimate_sent'
              OR (pipeline_stage = 'stage_3_site_visit_estimate' AND proposal_sent_at IS NOT NULL)
          )
          AND (
              (proposal_sent_at IS NOT NULL AND proposal_sent_at <= NOW() - INTERVAL '48 hours')
              OR (stage_entered_at IS NOT NULL AND stage_entered_at <= NOW() - INTERVAL '48 hours')
          )
        RETURNING id
    """)
    res_auto = await db.execute(auto_transition_sql)
    auto_ids = res_auto.scalars().all()
    if auto_ids:
        for aid in auto_ids:
            try:
                await db.execute(text("""
                    INSERT INTO activities (entity_type, entity_id, activity_type, title, description, created_at)
                    VALUES ('lead', :lid, 'stage_changed', 'Auto-Moved to Follow-Up', '48-hour review window elapsed. Lead automatically moved to Follow-Up.', NOW())
                """), {"lid": aid})
            except Exception:
                pass
        await db.commit()

    return {
        "ok": True,
        "swept_count": len(auto_ids),
        "lead_ids": auto_ids,
        "timestamp": datetime.now().isoformat(),
    }

