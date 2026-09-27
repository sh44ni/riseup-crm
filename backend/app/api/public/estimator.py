import orjson
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["Estimator"])

@router.get("/api/estimator/config")
async def get_estimator_config(db: AsyncSession = Depends(get_db)):
    services_sql = text("""
        SELECT 
            s.id, s.slug, s.name, s.short_label, s.icon_key, s.badge_label, s.sort_order, s.is_active,
            p.id as pricing_id, p.price_per_sqft_low, p.price_per_sqft_high, p.base_fee_low, p.base_fee_high,
            p.min_sqft, p.max_sqft, p.apr_available, p.financing_apr, p.financing_term_months
        FROM estimator_services s
        LEFT JOIN estimator_pricing_rules p ON s.id = p.service_id
        WHERE s.is_active = true
        ORDER BY s.sort_order ASC
    """)
    services_rows = (await db.execute(services_sql)).mappings().all()

    presets_sql = text("""
        SELECT id, service_id, label, sqft_value, sort_order
        FROM estimator_size_presets
        ORDER BY sort_order ASC
    """)
    presets_rows = (await db.execute(presets_sql)).mappings().all()
    presets_all = [dict(p) for p in presets_rows]

    # Load custom multipliers & guardrails from app_settings
    settings_res = await db.execute(text("SELECT value FROM app_settings WHERE key = 'pricing_config'"))
    row_val = settings_res.scalar_one_or_none()
    pricing_config = {}
    if row_val:
        pricing_config = orjson.loads(row_val) if isinstance(row_val, str) else row_val

    services_list = []
    pricing_rules_flat = []

    for s in services_rows:
        sid = s["id"]
        # Match presets for this service (or global presets where service_id is None)
        service_presets = [
            {
                "id": p["id"],
                "serviceId": p["service_id"],
                "label": p["label"],
                "sqftValue": p["sqft_value"],
                "sortOrder": p["sort_order"],
            }
            for p in presets_all
            if p["service_id"] is None or p["service_id"] == sid
        ]

        p_low = float(s["price_per_sqft_low"] or 4.0)
        p_high = float(s["price_per_sqft_high"] or 6.2)
        b_low = float(s["base_fee_low"] or 500.0)
        b_high = float(s["base_fee_high"] or 950.0)
        min_s = int(s["min_sqft"] or 800)
        max_s = int(s["max_sqft"] or 8000)
        apr_avail = bool(s["apr_available"] if s["apr_available"] is not None else True)
        f_apr = float(s["financing_apr"] or 0.0)
        f_term = int(s["financing_term_months"] or 60)

        pricing_obj = {
            "id": s["pricing_id"],
            "pricePerSqftLow": p_low,
            "pricePerSqftHigh": p_high,
            "baseFeeLow": b_low,
            "baseFeeHigh": b_high,
            "minSqft": min_s,
            "maxSqft": max_s,
            "aprAvailable": apr_avail,
            "financingApr": f_apr,
            "financingTermMonths": f_term,
            # snake_case backward compatibility:
            "price_per_sqft_low": p_low,
            "price_per_sqft_high": p_high,
            "base_fee_low": b_low,
            "base_fee_high": b_high,
            "min_sqft": min_s,
            "max_sqft": max_s,
            "apr_available": apr_avail,
            "financing_apr": f_apr,
            "financing_term_months": f_term,
        }

        services_list.append({
            "id": sid,
            "slug": s["slug"],
            "name": s["name"],
            "shortLabel": s["short_label"],
            "iconKey": s["icon_key"],
            "badgeLabel": s["badge_label"],
            "sortOrder": s["sort_order"],
            "isActive": s["is_active"],
            "pricing": pricing_obj,
            "presets": service_presets,
        })

        pricing_rules_flat.append({
            "id": s["pricing_id"],
            "service_id": sid,
            "slug": s["slug"],
            "name": s["name"],
            **pricing_obj
        })

    return {
        "ok": True,
        "services": services_list,
        "pricingRules": pricing_rules_flat,
        "marginGuardrails": pricing_config.get("marginGuardrails", {
            "targetGrossMargin": 38,
            "hardFloorMargin": 28,
            "salesCommissionRate": 10,
        }),
        "pitchMultipliers": pricing_config.get("pitchMultipliers", {
            "flatTo3_12": 1.0,
            "fourTo6_12": 1.05,
            "sevenTo9_12": 1.15,
            "tenPlus_12": 1.30,
        }),
        "storyMultipliers": pricing_config.get("storyMultipliers", {
            "oneStory": 1.0,
            "twoStory": 1.08,
            "threeStoryCoastal": 1.22,
        }),
        "tearOffRates": pricing_config.get("tearOffRates", {
            "shingle1Layer": 35,
            "shingle2Layer": 55,
            "tileConcrete": 75,
            "woodShake": 95,
        }),
        "permitFees": pricing_config.get("permitFees", {
            "oceanside": 485,
            "carlsbad": 520,
            "encinitas": 560,
            "vista": 460,
        }),
        "wasteFactors": pricing_config.get("wasteFactors", {
            "gableStandard": 10,
            "hipComplex": 15,
            "cutValleysDormers": 18,
        }),
        "presets": presets_all,
    }

@router.post("/api/estimator/calculate")
async def calculate_estimator(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    service_ref = body.get("serviceSlug") or body.get("serviceId") or body.get("service_slug") or body.get("service_id")
    sqft_raw = body.get("sqft") or body.get("roofSqf") or body.get("roof_sqf") or 0
    try:
        sqft = int(sqft_raw)
    except (ValueError, TypeError):
        sqft = 0

    source = body.get("source") or "custom"
    session_id = body.get("sessionId")
    pitch = str(body.get("pitch") or "flatTo3_12")
    stories = int(body.get("stories") or 1)

    if not service_ref or sqft <= 0:
        raise HTTPException(status_code=400, detail="Valid service slug or ID and square footage (>0) are required")

    # Match by slug or by numeric id
    if isinstance(service_ref, int) or (isinstance(service_ref, str) and service_ref.isdigit()):
        rule_sql = text("""
            SELECT s.id as service_id, s.slug, s.name, r.price_per_sqft_low, r.price_per_sqft_high,
                   r.base_fee_low, r.base_fee_high, r.financing_apr, r.financing_term_months,
                   r.min_sqft, r.max_sqft, r.apr_available
            FROM estimator_services s
            JOIN estimator_pricing_rules r ON s.id = r.service_id
            WHERE s.id = :sid AND s.is_active = true
        """)
        params = {"sid": int(service_ref)}
    else:
        rule_sql = text("""
            SELECT s.id as service_id, s.slug, s.name, r.price_per_sqft_low, r.price_per_sqft_high,
                   r.base_fee_low, r.base_fee_high, r.financing_apr, r.financing_term_months,
                   r.min_sqft, r.max_sqft, r.apr_available
            FROM estimator_services s
            JOIN estimator_pricing_rules r ON s.id = r.service_id
            WHERE s.slug = :slug AND s.is_active = true
        """)
        params = {"slug": str(service_ref).strip().lower()}

    res = (await db.execute(rule_sql, params)).mappings().first()
    if not res:
        # Fallback to residential
        fallback_sql = text("""
            SELECT s.id as service_id, s.slug, s.name, r.price_per_sqft_low, r.price_per_sqft_high,
                   r.base_fee_low, r.base_fee_high, r.financing_apr, r.financing_term_months,
                   r.min_sqft, r.max_sqft, r.apr_available
            FROM estimator_services s
            JOIN estimator_pricing_rules r ON s.id = r.service_id
            WHERE s.slug = 'residential' AND s.is_active = true
        """)
        res = (await db.execute(fallback_sql)).mappings().first()

    if not res:
        raise HTTPException(status_code=404, detail="Service configuration not found")

    p_low = float(res["price_per_sqft_low"])
    p_high = float(res["price_per_sqft_high"])
    b_low = float(res["base_fee_low"])
    b_high = float(res["base_fee_high"])
    term_months = int(res["financing_term_months"] or 60)

    # Multiplier evaluation
    pitch_mult = 1.0
    if pitch in ("4/12", "5/12", "6/12", "fourTo6_12"):
        pitch_mult = 1.05
    elif pitch in ("7/12", "8/12", "9/12", "sevenTo9_12"):
        pitch_mult = 1.15
    elif pitch in ("10/12+", "tenPlus_12"):
        pitch_mult = 1.30

    story_mult = 1.0 if stories <= 1 else (1.08 if stories == 2 else 1.22)
    mult = pitch_mult * story_mult

    low = round((b_low + (sqft * p_low)) * mult)
    high = round((b_high + (sqft * p_high)) * mult)
    midpoint = round((low + high) / 2.0)
    monthly_low = round(low / term_months)
    monthly_high = round(high / term_months)

    # Save to estimator_leads for marketing funnel analytics
    try:
        insert_sql = text("""
            INSERT INTO estimator_leads (
                service_id, sqft_entered, estimate_low, estimate_high, source, session_id, created_at
            ) VALUES (
                :sid, :sqft, :low, :high, :source, :sess, NOW()
            ) RETURNING id
        """)
        lead_id = (await db.execute(insert_sql, {
            "sid": res["service_id"],
            "sqft": sqft,
            "low": low,
            "high": high,
            "source": source,
            "sess": session_id,
        })).scalar_one()
        await db.commit()
    except Exception:
        lead_id = None

    return {
        "ok": True,
        "id": lead_id,
        "service": res["name"],
        "serviceSlug": res["slug"],
        "sqft": sqft,
        "squares": round(sqft / 100.0, 1),
        "estimateLow": low,
        "estimateHigh": high,
        "estimatedValue": midpoint,
        "monthlyLow": monthly_low,
        "monthlyHigh": monthly_high,
        "termMonths": term_months,
        "formattedRange": f"${low:,} – ${high:,}",
        "formattedMonthly": f"${monthly_low}/mo – ${monthly_high}/mo",
    }
