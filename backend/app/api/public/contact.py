from app.core.logger import get_logger
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.middlewares.rate_limit import rate_limit
from app.services.sync import find_or_create_client, parse_address_components
logger = get_logger(__name__)

router = APIRouter(tags=["Public"])

@router.post("/api/contact", dependencies=[Depends(rate_limit("contact-form", 5, 600))])
async def submit_contact_form(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    # Honeypot spam defense
    if body.get("honeypot") and str(body.get("honeypot")).strip():
        return {"ok": True}

    full_name = body.get("fullName", "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Name is required")

    phone = (body.get("phone") or "").strip() or None
    raw_email = (body.get("email") or "").strip().lower()
    email = raw_email if raw_email else None
    subject = (body.get("subject") or "").strip() or None
    message = (body.get("message") or "").strip()
    service_type = body.get("serviceType") or body.get("service_type") or subject

    # Parse and normalize address components
    parsed_addr = parse_address_components(
        body.get("address"),
        body.get("city"),
        body.get("zip") or body.get("zipCode")
    )
    address = parsed_addr["address"]
    city = parsed_addr["city"]
    zip_code = parsed_addr["zip"]

    referer = request.headers.get("referer", "/")
    source_page = referer.split("?")[0] if referer else "/"

    # Link or provision 360 client profile
    client_id = await find_or_create_client(db, {
        "fullName": full_name,
        "phone": phone,
        "email": email,
        "address": address,
        "city": city,
        "zip": zip_code,
        "leadSource": "website_contact",
        "sourceType": "website",
        "leadSourceDetail": "Website Contact Form",
        "notes": f"Subject: {subject}" if subject else None,
    })

    # Insert lead record
    insert_sql = text("""
        INSERT INTO leads (
            form_type, full_name, phone, email, address, city, zip, service_type,
            subject, message, source_page, status, client_id, source_type,
            lead_source, lead_source_detail, created_at
        ) VALUES (
            'contact', :full_name, :phone, :email, :address, :city, :zip, :service_type,
            :subject, :message, :source_page, 'new', :client_id, 'website',
            'website_contact', 'Website Contact Form', NOW()
        ) RETURNING id
    """)

    lead_id = (await db.execute(insert_sql, {
        "full_name": full_name,
        "phone": phone,
        "email": email,
        "address": address,
        "city": city,
        "zip": zip_code,
        "service_type": service_type,
        "subject": subject,
        "message": message,
        "source_page": source_page,
        "client_id": client_id,
    })).scalar_one()

    # Log activity timeline entry
    await db.execute(text("""
        INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
        VALUES ('lead', :lid, :cid, 'system', 'Website Contact Form Received', :desc, 'Website Visitor', NOW())
    """), {
        "lid": lead_id,
        "cid": client_id,
        "desc": f"Subject: {subject or 'General Inquiry'}. Message: {message}",
    })
    await db.commit()

    # ── Instant Automated Emails Dispatch (Customer Confirmation + Team Alert) ──
    try:
        from app.services.email_service import (
            send_customer_welcome_inquiry_email,
            send_internal_lead_alert_email,
        )

        # 1. Customer Welcome Email
        if email and "@" in email:
            await send_customer_welcome_inquiry_email(
                to_email=email,
                customer_name=full_name,
                service_type=subject or "Roofing & Construction Inquiry",
                city_or_address="Oceanside & San Diego County",
                custom_message=message,
                form_type="contact",
            )

        # 2. Internal Team High-Priority Alert
        await send_internal_lead_alert_email(
            lead_id=lead_id,
            customer_name=full_name,
            phone=phone,
            email=email,
            service_type=subject or "Website Contact Query",
            notes=message,
            source_detail="Website Contact Form",
            priority="high",
        )
    except Exception as e:
        logger.warning(f"Automated inquiry email dispatch notice: {e}")

    return {"ok": True, "leadId": lead_id}
