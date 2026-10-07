from app.core.logger import get_logger
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.middlewares.rate_limit import rate_limit
from app.services.sync import find_or_create_client, parse_address_components
from app.core.audit import get_client_ip
from app.services.turnstile import verify_turnstile_token
from app.utils.phone import validate_and_clean_us_phone, format_us_phone
from app.utils.formatting import format_person_name
from app.utils.spam import check_honeypots, check_speed_trap, check_spam_content, SpamAttemptRecord
from app.utils.spam_logger import log_spam_attempt
from app.core.config import settings

logger = get_logger(__name__)

router = APIRouter(tags=["Public"])

@router.post("/api/contact", dependencies=[Depends(rate_limit("contact-form", 5, 600))])
async def submit_contact_form(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer", "/")

    # 1. Multi-decoy honeypot check (Silent drop)
    is_bot_hp, hp_reason = check_honeypots(body)
    if is_bot_hp:
        logger.info(f"[SPAM BLOCKED] Honeypot triggered ({hp_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="honeypot",
            block_detail=hp_reason,
            form_type="contact",
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}

    # 2. Time-lock speed trap check (Silent drop)
    is_bot_speed, speed_reason = check_speed_trap(body)
    if is_bot_speed:
        logger.info(f"[SPAM BLOCKED] Speed trap triggered ({speed_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="speed_trap",
            block_detail=speed_reason,
            form_type="contact",
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}

    # 3. Cloudflare Turnstile verification (Silent drop)
    if settings.CLOUDFLARE_TURNSTILE_SECRET_KEY:
        turnstile_token = body.get("turnstileToken") or body.get("turnstile_token") or body.get("cf-turnstile-response")
        if not turnstile_token:
            logger.info(f"[SPAM BLOCKED] Missing Turnstile token from IP {client_ip}")
            await log_spam_attempt(db, SpamAttemptRecord(
                block_reason="turnstile",
                block_detail="missing_turnstile_token",
                form_type="contact",
                ip_address=client_ip,
                user_agent=user_agent,
                page_referer=referer,
                payload_snapshot=body
            ))
            return {"ok": True}
        is_valid_turnstile = await verify_turnstile_token(turnstile_token, client_ip)
        if not is_valid_turnstile:
            logger.info(f"[SPAM BLOCKED] Invalid Turnstile token from IP {client_ip}")
            await log_spam_attempt(db, SpamAttemptRecord(
                block_reason="turnstile",
                block_detail="invalid_turnstile_token",
                form_type="contact",
                ip_address=client_ip,
                user_agent=user_agent,
                page_referer=referer,
                payload_snapshot=body
            ))
            return {"ok": True}

    full_name = format_person_name(body.get("fullName", ""))
    if not full_name:
        raise HTTPException(status_code=400, detail="Name is required")

    phone_raw = (body.get("phone") or "").strip()
    # 4. Strict NANP phone validation (Silent drop for impossible area codes / dummy bots)
    if phone_raw:
        is_valid_phone, cleaned_phone = validate_and_clean_us_phone(phone_raw)
        if not is_valid_phone:
            logger.info(f"[SPAM BLOCKED] Invalid NANP phone number '{phone_raw}' from IP {client_ip}")
            await log_spam_attempt(db, SpamAttemptRecord(
                block_reason="invalid_phone",
                block_detail=f"invalid_nanp_phone_{phone_raw}",
                form_type="contact",
                ip_address=client_ip,
                user_agent=user_agent,
                page_referer=referer,
                payload_snapshot=body
            ))
            return {"ok": True}
        phone = format_us_phone(cleaned_phone)
    else:
        phone = None

    raw_email = (body.get("email") or "").strip().lower()
    email = raw_email if raw_email else None
    subject = (body.get("subject") or "").strip() or None
    message = (body.get("message") or "").strip()

    # 5. Content spam & solicitation pattern filter (Silent drop)
    combined_content = f"{subject or ''} {message or ''} {full_name or ''}"
    is_spam_content, spam_reason = check_spam_content(combined_content)
    if is_spam_content:
        logger.info(f"[SPAM BLOCKED] Solicitation pattern detected ({spam_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="spam_content",
            block_detail=spam_reason,
            form_type="contact",
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}

    service_type = body.get("serviceType") or body.get("service_type") or subject
    lead_source = body.get("leadSource") or body.get("lead_source") or "website_contact"
    lead_source_detail = body.get("leadSourceDetail") or body.get("lead_source_detail") or "✉️ Website Contact Form"

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
        "leadSource": lead_source,
        "sourceType": "website",
        "leadSourceDetail": lead_source_detail,
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
            :lead_source, :lead_source_detail, NOW()
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
        "lead_source": lead_source,
        "lead_source_detail": lead_source_detail,
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
