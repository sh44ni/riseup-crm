from app.core.database import async_session_factory
from app.services.reviews import sync_google_reviews, sync_yelp_reviews

async def cron_sync_all_reviews(ctx: dict) -> dict:
    """
    Periodic background job to synchronize Google and Yelp reviews.
    """
    async with async_session_factory() as db:
        try:
            google_res = await sync_google_reviews(db)
            yelp_res = await sync_yelp_reviews(db)
            await db.commit()
            return {
                "google": google_res,
                "yelp": yelp_res,
            }
        except Exception as e:
            await db.rollback()
            return {"error": str(e)}
