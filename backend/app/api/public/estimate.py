from app.core.logger import get_logger
import re
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.middlewares.rate_limit import rate_limit
from app.services.sync import (
    find_or_create_client,
    parse_address_components,
    find_active_lead,
    merge_inquiry_into_lead,
)
from app.services.scoring import calculate_lead_score
from app.services.calculator import calculate_lead_estimated_value
from app.core.audit import get_client_ip
from app.services.turnstile import verify_turnstile_token
from app.utils.phone import validate_and_clean_us_phone, format_us_phone
from app.utils.formatting import format_person_name
from app.utils.spam import check_honeypots, check_speed_trap, check_spam_content, SpamAttemptRecord
from app.utils.spam_logger import log_spam_attempt
from app.core.config import settings
logger = get_logger(__name__)

router = APIRouter(tags=["Public"])

@router.post("/api/estimate", dependencies=[Depends(rate_limit("estimate-form", 5, 600))])
async def submit_estimate_form(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    referer = request.headers.get("referer", "/")
    form_type = body.get("formType") or body.get("form_type") or "estimate"

    # 1. Multi-decoy honeypot check (Silent drop)
    is_bot_hp, hp_reason = check_honeypots(body)
    if is_bot_hp:
        logger.info(f"[SPAM BLOCKED] Estimate honeypot triggered ({hp_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="honeypot",
            block_detail=hp_reason,
            form_type=form_type,
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}

    # 2. Time-lock speed trap check (Silent drop)
    is_bot_speed, speed_reason = check_speed_trap(body)
    if is_bot_speed:
        logger.info(f"[SPAM BLOCKED] Estimate speed trap triggered ({speed_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="speed_trap",
            block_detail=speed_reason,
            form_type=form_type,
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
            logger.info(f"[SPAM BLOCKED] Estimate missing Turnstile token from IP {client_ip}")
            await log_spam_attempt(db, SpamAttemptRecord(
                block_reason="turnstile",
                block_detail="missing_turnstile_token",
                form_type=form_type,
                ip_address=client_ip,
                user_agent=user_agent,
                page_referer=referer,
                payload_snapshot=body
            ))
            return {"ok": True}
        is_valid_turnstile = await verify_turnstile_token(turnstile_token, client_ip)
        if not is_valid_turnstile:
            logger.info(f"[SPAM BLOCKED] Estimate invalid Turnstile token from IP {client_ip}")
            await log_spam_attempt(db, SpamAttemptRecord(
                block_reason="turnstile",
                block_detail="invalid_turnstile_token",
                form_type=form_type,
                ip_address=client_ip,
                user_agent=user_agent,
                page_referer=referer,
                payload_snapshot=body
            ))
            return {"ok": True}

    full_name = format_person_name(body.get("fullName") or body.get("name") or "")
    phone_raw = (body.get("phone") or "").strip()
    if not full_name or not phone_raw:
        raise HTTPException(status_code=400, detail="Name and phone are required")

    # 4. Strict NANP phone validation (Silent drop for impossible area codes / dummy bots)
    is_valid_phone, cleaned_phone = validate_and_clean_us_phone(phone_raw)
    if not is_valid_phone:
        logger.info(f"[SPAM BLOCKED] Estimate invalid NANP phone number '{phone_raw}' from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="invalid_phone",
            block_detail=f"invalid_nanp_phone_{phone_raw}",
            form_type=form_type,
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}
    phone = format_us_phone(cleaned_phone)

    # 5. Content spam & solicitation pattern filter (Silent drop)
    notes_check = body.get("notes") or ""
    combined_content = f"{full_name} {notes_check}"
    is_spam_content, spam_reason = check_spam_content(combined_content)
    if is_spam_content:
        logger.info(f"[SPAM BLOCKED] Estimate solicitation pattern detected ({spam_reason}) from IP {client_ip}")
        await log_spam_attempt(db, SpamAttemptRecord(
            block_reason="spam_content",
            block_detail=spam_reason,
            form_type=form_type,
            ip_address=client_ip,
            user_agent=user_agent,
            page_referer=referer,
            payload_snapshot=body
        ))
        return {"ok": True}

    # Parse and normalize address, city, and zip cleanly
    parsed_addr = parse_address_components(
        body.get("address"),
        body.get("city"),
        body.get("zip") or body.get("zipCode")
    )
    address = parsed_addr["address"]
    city = parsed_addr["city"]
    zip_code = parsed_addr["zip"]

    service_type = body.get("serviceType") or "Roof Replacement"
    notes = body.get("notes") or ""
    raw_email = (body.get("email") or "").strip().lower()
    email = raw_email if raw_email else None
    form_type = body.get("formType") or "estimate"
    lead_source = body.get("leadSource") or "website"

    # Extract roof size if passed explicitly or embedded in notes
    roof_sqf = body.get("roof_sqf") or body.get("roofSqf") or body.get("sqft")
    if not roof_sqf and notes:
        # Match pattern like (2,750 sq ft) or 2750 sqft
        match = re.search(r"(\d[\d,]*)\s*(?:sq\s*ft|sqft|squares)", notes, re.IGNORECASE)
        if match:
            try:
                roof_sqf = float(match.group(1).replace(",", ""))
            except ValueError:
                roof_sqf = None

    sqft_val = float(roof_sqf) if roof_sqf else 2500.0
    squares_val = round(sqft_val / 100.0, 1)

    # Auto-calculate estimated deal value from global pricing formulas
    val_calc = calculate_lead_estimated_value(
        sqft=sqft_val,
        service_type=service_type,
    )
    estimated_value = float(body.get("estimated_value") or body.get("estimatedValue") or val_calc["estimated_value"])

    # Evaluate lead score & priority
    score, priority, factors = calculate_lead_score({
        "serviceType": service_type,
        "phone": phone,
        "email": email,
        "address": address,
        "zip": zip_code,
        "formType": form_type,
        "leadSource": lead_source,
    })

    referer = request.headers.get("referer", "/")
    source_page = referer.split("?")[0] if referer else "/"

    detail = body.get("leadSourceDetail") or body.get("lead_source_detail")
    if not detail:
        if form_type in ("estimator_full", "calculator") or lead_source == "website_estimator":
            detail = "📊 Instant Estimator"
        elif form_type == "storm_promo" or lead_source == "storm_promo_popup":
            detail = "⚡ $1,000 Off Storm Voucher"
        elif "/service-area/" in source_page:
            city_slug = source_page.replace("/service-area/", "").strip("/").capitalize()
            detail = f"📍 Landing ({city_slug})"
        else:
            detail = "Website Free Estimate"

    client_id = await find_or_create_client(db, {
        "fullName": full_name,
        "phone": phone,
        "email": email,
        "address": address,
        "city": city,
        "zip": zip_code,
        "leadSource": lead_source or "website_estimate",
        "sourceType": "website",
        "leadSourceDetail": detail,
        "notes": notes,
    })

    # Check for existing active lead for this homeowner
    existing_lead = await find_active_lead(db, client_id=client_id, phone=phone, email=email)
    is_merged = False

    if existing_lead:
        is_merged = True
        lead_id = await merge_inquiry_into_lead(
            db,
            existing_lead,
            client_id=client_id,
            form_type=form_type,
            lead_source=lead_source,
            lead_source_detail=detail,
            service_type=service_type,
            notes=notes,
            address=address,
            city=city,
            zip_code=zip_code,
            roof_sqf=sqft_val,
            roof_squares=squares_val,
            roof_type=service_type,
            estimated_value=estimated_value,
            source_page=source_page,
        )
        await db.commit()
    else:
        insert_sql = text("""
            INSERT INTO leads (
                form_type, full_name, phone, email, address, city, zip, service_type,
                notes, source_page, status, priority, lead_score, lead_source, client_id,
                source_type, lead_source_detail, pipeline_stage, stage_entered_at,
                roof_sqf, roof_squares, roof_type, estimated_value, created_at
            ) VALUES (
                :form_type, :full_name, :phone, :email, :address, :city, :zip, :service_type,
                :notes, :source_page, 'new', :priority, :score, :lead_source, :client_id,
                'website', :detail, 'stage_1_lead_gen', NOW(),
                :roof_sqf, :roof_squares, :roof_type, :estimated_value, NOW()
            ) RETURNING id
        """)

        lead_id = (await db.execute(insert_sql, {
            "form_type": form_type,
            "full_name": full_name,
            "phone": phone,
            "email": email,
            "address": address,
            "city": city,
            "zip": zip_code,
            "service_type": service_type,
            "notes": notes,
            "source_page": source_page,
            "priority": priority,
            "score": score,
            "lead_source": lead_source,
            "client_id": client_id,
            "detail": detail,
            "roof_sqf": sqft_val,
            "roof_squares": squares_val,
            "roof_type": service_type,
            "estimated_value": estimated_value,
        })).scalar_one()

        # Log activity
        if form_type == "storm_promo" or lead_source == "storm_promo_popup":
            title = "⚡ Storm Season Alert $1,000 Off Claimed"
        elif form_type in ("estimator_full", "calculator") or lead_source == "website_estimator":
            title = "📊 Instant Estimator Ballpark Submitted"
        elif "/service-area/" in source_page:
            title = f"📍 Priority Local Roof Inspection ({city or 'Local'})"
        else:
            title = "New Estimate Request"
        await db.execute(text("""
            INSERT INTO activities (entity_type, entity_id, client_id, activity_type, title, description, performed_by, created_at)
            VALUES ('lead', :lid, :cid, 'form_submission', :title, :desc, 'Website Visitor', NOW())
        """), {
            "lid": lead_id,
            "cid": client_id,
            "title": title,
            "desc": notes or f"Inquiry submitted through website portal ({detail}) - ${estimated_value:,.0f} estimated value",
        })
        await db.commit()

    # ── Instant Automated Emails Dispatch (Customer Confirmation + Team Alert) ──
    try:
        from app.services.email_service import (
            send_customer_welcome_inquiry_email,
            send_internal_lead_alert_email,
        )

        estimate_range_str = f"${estimated_value*0.9:,.0f} – ${estimated_value*1.15:,.0f}" if estimated_value and estimated_value > 0 else None

        # 1. Customer Welcome Email with Estimate Details
        if email and "@" in email:
            await send_customer_welcome_inquiry_email(
                to_email=email,
                customer_name=full_name,
                service_type=service_type or "Roofing Estimate",
                city_or_address=f"{address or ''}, {city or 'Oceanside'}".strip(", "),
                custom_message=notes,
                estimate_range=estimate_range_str,
                form_type=form_type or "estimate",
            )

        # 2. Internal Team High-Priority Alert
        source_note = f"Additional Inquiry (Merged into Lead #{lead_id}) - {detail}" if is_merged else detail
        await send_internal_lead_alert_email(
            lead_id=lead_id,
            customer_name=full_name,
            phone=phone,
            email=email,
            address=address,
            city=city,
            service_type=service_type or "Free Estimate Request",
            estimated_value=estimated_value,
            notes=f"[MERGED ADDITIONAL INQUIRY]\n{notes}" if is_merged else notes,
            source_detail=source_note,
            priority=priority,
        )
    except Exception as e:
        logger.warning(f"Automated estimate email dispatch notice: {e}")

    return {
        "ok": True,
        "leadId": lead_id,
        "estimatedValue": estimated_value,
        "roofSqf": sqft_val,
        "merged": is_merged,
    }
