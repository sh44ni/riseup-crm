from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import orjson
from datetime import datetime
from app.core.database import get_db

router = APIRouter(tags=["Public Reviews"])

GOOGLE_REVIEWS_URL = "https://search.google.com/local/writereview?placeid=ChIJ-f_1oGhw3IAR_vK8N8E2i6I"
YELP_REVIEWS_URL = "https://www.yelp.com/biz/rise-up-roofing-and-construction-oceanside-2"

@router.get("/api/reviews/public")
async def get_public_reviews_and_stats(db: AsyncSession = Depends(get_db)):
    """
    Public reviews endpoint serving published reviews and aggregate review statistics
    to the Next.js marketing website.
    """
    # 1. Fetch published reviews
    reviews_sql = text("""
        SELECT id, customer_name, customer_city, rating, feedback, service_type, source,
               status, created_at
        FROM reviews
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT 50
    """)
    rows = (await db.execute(reviews_sql)).mappings().all()

    enriched_reviews: List[Dict[str, Any]] = []
    for r in rows:
        is_yelp = r["source"] == "yelp"
        date_source = r.get("created_at")
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
            "authorPhoto": None,
            "ownerReply": None,
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
