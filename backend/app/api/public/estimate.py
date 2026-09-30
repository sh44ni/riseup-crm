from app.core.logger import get_logger
import re
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.middlewares.rate_limit import rate_limit
from app.services.sync import find_or_create_client, parse_address_components
from app.services.scoring import calculate_lead_score
from app.services.calculator import calculate_lead_estimated_value
logger = get_logger(__name__)

router = APIRouter(tags=["Public"])

@router.post("/api/estimate", dependencies=[Depends(rate_limit("estimate-form", 5, 600))])
async def submit_estimate_form(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()

    # Honeypot spam defense
    if body.get("honeypot") and str(body.get("honeypot")).strip():
        return {"ok": True}

    full_name = (body.get("fullName") or body.get("name") or "").strip()
    phone = (body.get("phone") or "").strip()
    if not full_name or not phone:
        raise HTTPException(status_code=400, detail="Name and phone are required")

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

    detail = "Website Free Estimate"
    if form_type in ("estimator_full", "calculator"):
        detail = "Instant Estimator"
    elif form_type == "storm_promo" or lead_source == "storm_promo_popup":
        detail = "Storm Season Alert"
    elif "/service-area/" in source_page:
        city_slug = source_page.replace("/service-area/", "").strip("/")
        detail = f"Website Landing ({city_slug})"

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
    title = "⚡ Storm Season Alert $1,000 Off Claimed" if form_type == "storm_promo" else "New Estimate Request"
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
        await send_internal_lead_alert_email(
            lead_id=lead_id,
            customer_name=full_name,
            phone=phone,
            email=email,
            address=address,
            city=city,
            service_type=service_type or "Free Estimate Request",
            estimated_value=estimated_value,
            notes=notes,
            source_detail=detail,
            priority=priority,
        )
    except Exception as e:
        logger.warning(f"Automated estimate email dispatch notice: {e}")

    return {
        "ok": True,
        "leadId": lead_id,
        "estimatedValue": estimated_value,
        "roofSqf": sqft_val,
    }
