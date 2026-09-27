import re
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["Customer Portals"])

@router.get("/api/inspection/{identifier}")
async def get_inspection_portal(identifier: str, db: AsyncSession = Depends(get_db)):
    if re.match(r"^\d+$", identifier):
        raise HTTPException(status_code=404, detail="Inspection not found")

    sql = text("""
        SELECT i.*, l.full_name as customer_name, l.address, l.city, l.zip
        FROM inspections i
        LEFT JOIN leads l ON i.lead_id = l.id
        WHERE i.inspection_number = :id OR i.access_token = :id
        LIMIT 1
    """)
    res = (await db.execute(sql, {"id": identifier})).mappings().first()
    if not res:
        raise HTTPException(status_code=404, detail="Inspection report not found or link has expired")

    return {"inspection": dict(res)}

@router.get("/api/warranty/{identifier}")
async def get_warranty_portal(identifier: str, db: AsyncSession = Depends(get_db)):
    if re.match(r"^\d+$", identifier):
        raise HTTPException(status_code=404, detail="Warranty not found")

    sql = text("""
        SELECT w.*, j.customer_name, j.address, j.city, j.zip, j.service_type
        FROM warranties w
        LEFT JOIN jobs j ON w.job_id = j.id
        WHERE w.warranty_number = :id OR w.access_token = :id
        LIMIT 1
    """)
    res = (await db.execute(sql, {"id": identifier})).mappings().first()
    if not res:
        raise HTTPException(status_code=404, detail="Warranty certificate not found or link has expired")

    return {"warranty": dict(res)}

@router.get("/api/review/{token}")
async def get_review_request(token: str, db: AsyncSession = Depends(get_db)):
    sql = text("SELECT * FROM reviews WHERE review_token = :token LIMIT 1")
    res = (await db.execute(sql, {"token": token})).mappings().first()
    if not res:
        raise HTTPException(status_code=404, detail="Review request not found or link expired")

    return {"review": dict(res)}

@router.post("/api/review/{token}")
async def submit_review_feedback(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    rating = int(body.get("rating") or 5)
    feedback = body.get("feedback")
    google_clicked = bool(body.get("googleClicked"))

    sql = text("""
        UPDATE reviews
        SET rating = :rating,
            feedback = :feedback,
            google_clicked = :google_clicked,
            status = 'submitted',
            updated_at = NOW()
        WHERE review_token = :token
        RETURNING id
    """)
    res = (await db.execute(sql, {
        "rating": rating,
        "feedback": feedback,
        "google_clicked": google_clicked,
        "token": token,
    })).first()

    if not res:
        raise HTTPException(status_code=404, detail="Review not found")

    return {"ok": True, "message": "Thank you for your review!"}
