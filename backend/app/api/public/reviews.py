from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import orjson
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["Public Reviews"])

GOOGLE_REVIEWS_URL = "https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I"
YELP_REVIEWS_URL = "https://www.yelp.com/biz/rise-up-roofing-and-construction-oceanside-2"

class ManualReviewPayload(BaseModel):
    customer_name: str
    rating: int = Field(5, ge=1, le=5)
    feedback: str
    customer_city: Optional[str] = "Oceanside"
    service_type: Optional[str] = "Roofing & Construction"
    source: Optional[str] = "google"
    owner_reply: Optional[str] = None
    original_time: Optional[str] = None
    google_review_id: Optional[str] = None

@router.get("/api/reviews/public")
async def get_public_reviews_and_stats(db: AsyncSession = Depends(get_db)):
    """
    Public reviews endpoint serving published reviews and aggregate review statistics
    to the Next.js marketing website.
    """
    # 1. Fetch published reviews
    reviews_sql = text("""
        SELECT id, customer_name, customer_city, rating, feedback, service_type, source,
               status, author_photo, owner_reply, original_time, created_at
        FROM reviews
        WHERE status = 'published'
        ORDER BY COALESCE(original_time, created_at::text) DESC
    """)
    rows = (await db.execute(reviews_sql)).mappings().all()

    enriched_reviews: List[Dict[str, Any]] = []
    for r in rows:
        is_yelp = r["source"] == "yelp"
        date_source = r.get("original_time") or r.get("created_at")
        formatted_date = "Recent"
        if date_source:
            try:
                if isinstance(date_source, str):
                    dt = datetime.fromisoformat(date_source.replace("Z", "+00:00"))
                else:
                    dt = date_source
                formatted_date = dt.strftime("%B %Y")
            except Exception:
                formatted_date = "Recent"

        enriched_reviews.append({
            "id": str(r["id"]),
            "author": r["customer_name"] or "Verified Homeowner",
            "location": f"{r['customer_city']}, CA" if r.get("customer_city") else "San Diego County, CA",
            "neighborhood": f"{r['customer_city']}, CA" if r.get("customer_city") else "North County, San Diego",
            "projectType": r.get("service_type") or "Roofing & Construction",
            "rating": r["rating"] or 5,
            "text": r.get("feedback") or "Outstanding roofing and construction craftsmanship. Prompt, clean, and reliable service.",
            "source": "yelp" if is_yelp else "google",
            "serviceCategory": (r.get("service_type") or "residential").lower(),
            "date": formatted_date,
            "authorPhoto": r.get("author_photo"),
            "ownerReply": r.get("owner_reply"),
            "reviewUrl": YELP_REVIEWS_URL if is_yelp else GOOGLE_REVIEWS_URL,
        })

    # 2. Fetch stats
    stats_sql = text("""
        SELECT COALESCE(source, 'direct') as source, COUNT(*)::text as cnt, AVG(rating)::text as avg_rating
        FROM reviews
        WHERE status = 'published'
        GROUP BY source
    """)
    stats_rows = (await db.execute(stats_sql)).mappings().all()

    total_count = 0
    sum_rating = 0.0
    google_count = 0
    yelp_count = 0
    google_rating_sum = 0.0

    for s in stats_rows:
        count = int(s["cnt"] or 0)
        avg = float(s["avg_rating"] or 5.0)
        total_count += count
        sum_rating += avg * count
        if s["source"] == "google":
            google_count = count
            google_rating_sum = avg * count
        elif s["source"] == "yelp":
            yelp_count = count

    # Fetch Yelp settings if present
    yelp_settings_row = (await db.execute(text("SELECT value FROM app_settings WHERE key = 'yelp_reviews_auth'"))).scalar_one_or_none()
    yelp_settings = {}
    if yelp_settings_row:
        try:
            yelp_settings = orjson.loads(yelp_settings_row) if isinstance(yelp_settings_row, str) else yelp_settings_row
        except Exception:
            yelp_settings = {}

    yelp_total_count = yelp_settings.get("business_review_count") or (yelp_count if yelp_count > 0 else 1)
    yelp_rating = round(float(yelp_settings.get("business_rating") or 5.0), 1)
    yelp_url = yelp_settings.get("business_url") or YELP_REVIEWS_URL

    average_rating = round(sum_rating / total_count, 1) if total_count > 0 else 5.0
    google_rating = round(google_rating_sum / google_count, 1) if google_count > 0 else 5.0

    return {
        "ok": True,
        "reviews": enriched_reviews,
        "stats": {
            "totalCount": total_count,
            "averageRating": average_rating,
            "googleCount": google_count,
            "yelpCount": yelp_count,
            "yelpTotalCount": yelp_total_count,
            "yelpRating": yelp_rating,
            "googleRating": google_rating,
            "yelpUrl": yelp_url,
            "googleUrl": GOOGLE_REVIEWS_URL,
        }
    }


@router.post("/api/reviews/manual-import")
async def manual_import_review_endpoint(
    payload: ManualReviewPayload,
    authorization: Optional[str] = Header(None),
    secret: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Import or update a review manually.
    Protected by CRON_SECRET or MIGRATION_KEY.
    """
    cron_secret = settings.CRON_SECRET
    migration_key = settings.MIGRATION_KEY
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1].strip()

    is_authorized = (
        (cron_secret and (auth_token == cron_secret or secret == cron_secret)) or
        (migration_key and (auth_token == migration_key or secret == migration_key))
    )
    if not is_authorized:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid secret or token")

    from app.services.reviews import import_manual_review
    result = await import_manual_review(
        db,
        customer_name=payload.customer_name,
        rating=payload.rating,
        feedback=payload.feedback,
        customer_city=payload.customer_city or "Oceanside",
        service_type=payload.service_type or "Roofing & Construction",
        source=payload.source or "google",
        owner_reply=payload.owner_reply,
        original_time=payload.original_time,
        google_review_id=payload.google_review_id,
    )
    return result

