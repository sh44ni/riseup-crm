from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Dict, Any, List, Optional
import orjson

from app.core.database import get_db
from app.core.permissions import require_auth_user, has_permission, require_permission
from app.core.redis import cache_delete

router = APIRouter()

SERVICE_SLUG_MAP = {
    "residential": "residential",
    "tile": "residential",
    "shingle": "residential",
    "replacement": "residential",
    "residential roofing": "residential",
    "tile / shingle roof": "residential",
    "concrete / spanish tile relay & reset": "residential",
    "asphalt & architectural shingle": "residential",
    "repair": "repair",
    "leak": "repair",
    "leak & tile repair": "repair",
    "emergency roof leak repair": "repair",
    "maintenance": "repair",
    "commercial": "commercial",
    "flat": "commercial",
    "commercial flat roofing": "commercial",
    "commercial flat roof": "commercial",
    "tpo": "commercial",
    "bur": "commercial",
    "solar": "solar",
    "solar + roofing": "solar",
    "solar detach & reset (r&r)": "solar",
}

@router.get("/estimator")
async def get_admin_estimator_config(
    user: Dict[str, Any] = Depends(require_permission("estimator_settings.view")),
    db: AsyncSession = Depends(get_db)
):
    # 1. Services with joined pricing rules
    query = text("""
        SELECT 
            s.id AS service_id,
            s.slug,
            s.name,
            s.short_label,
            s.icon_key,
            s.badge_label,
            s.sort_order,
            s.is_active,
            r.id AS rule_id,
            r.price_per_sqft_low,
            r.price_per_sqft_high,
            r.base_fee_low,
            r.base_fee_high,
            r.min_sqft,
            r.max_sqft,
            r.apr_available,
            r.financing_apr,
            r.financing_term_months,
            r.updated_at
        FROM estimator_services s
        LEFT JOIN estimator_pricing_rules r ON s.id = r.service_id
        ORDER BY s.sort_order ASC
    """)
    rows = (await db.execute(query)).mappings().all()

    # Presets
    presets_query = text("""
        SELECT id, service_id, label, sqft_value, sort_order
        FROM estimator_size_presets
        ORDER BY service_id ASC, sort_order ASC
    """)
    preset_rows = (await db.execute(presets_query)).mappings().all()

    services_list = []
    pricing_rules_list = []
    for r in rows:
        service_dict = {
            "id": r["service_id"],
            "slug": r["slug"],
            "name": r["name"],
            "short_label": r["short_label"],
            "icon_key": r["icon_key"],
            "badge_label": r["badge_label"],
            "sort_order": r["sort_order"],
            "is_active": r["is_active"],
        }
        services_list.append(service_dict)

        if r["rule_id"]:
            rule_dict = {
                "id": r["rule_id"],
                "service_id": r["service_id"],
                "slug": r["slug"],
                "name": r["name"],
                "price_per_sqft_low": float(r["price_per_sqft_low"] or 0),
                "price_per_sqft_high": float(r["price_per_sqft_high"] or 0),
                "base_fee_low": float(r["base_fee_low"] or 0),
                "base_fee_high": float(r["base_fee_high"] or 0),
                "min_sqft": int(r["min_sqft"] or 500),
                "max_sqft": int(r["max_sqft"] or 12000),
                "apr_available": bool(r["apr_available"]),
                "financing_apr": float(r["financing_apr"] or 0),
                "financing_term_months": int(r["financing_term_months"] or 60),
            }
            pricing_rules_list.append(rule_dict)

    # Multipliers stored in app_settings (pricing_config)
    settings_res = await db.execute(text("SELECT value FROM app_settings WHERE key = 'pricing_config'"))
    row_val = settings_res.scalar_one_or_none()
    pricing_config = {}
    if row_val:
        pricing_config = orjson.loads(row_val) if isinstance(row_val, str) else row_val

    return {
        "ok": True,
        "services": services_list,
        "pricingRules": pricing_rules_list,
        "presets": [dict(p) for p in preset_rows],
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
    }

@router.post("/estimator")
async def update_admin_estimator_config(
    request: Request,
    user: Dict[str, Any] = Depends(require_permission("estimator_settings.edit")),
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()

    # 1. If pricingRules passed, update estimator_pricing_rules table
    pricing_rules = body.get("pricingRules")
    if pricing_rules and isinstance(pricing_rules, list):
        for rule in pricing_rules:
            sid = rule.get("service_id")
            if not sid:
                continue
            await db.execute(
                text("""
                    UPDATE estimator_pricing_rules
                    SET price_per_sqft_low = :low,
                        price_per_sqft_high = :high,
                        base_fee_low = :blow,
                        base_fee_high = :bhigh,
                        min_sqft = :mins,
                        max_sqft = :maxs,
                        apr_available = :apr,
                        financing_apr = :fapr,
                        financing_term_months = :term,
                        updated_at = NOW(),
                        updated_by = :upby
                    WHERE service_id = :sid
                """),
                {
                    "sid": sid,
                    "low": float(rule.get("price_per_sqft_low", 4.0)),
                    "high": float(rule.get("price_per_sqft_high", 6.2)),
                    "blow": float(rule.get("base_fee_low", 500.0)),
                    "bhigh": float(rule.get("base_fee_high", 950.0)),
                    "mins": int(rule.get("min_sqft", 500)),
                    "maxs": int(rule.get("max_sqft", 12000)),
                    "apr": bool(rule.get("apr_available", True)),
                    "fapr": float(rule.get("financing_apr", 0.0)),
                    "term": int(rule.get("financing_term_months", 60)),
                    "upby": user.get("name") or user.get("email") or "Owner",
                }
            )

    # 2. Update multiplier settings in app_settings
    stored_keys = ["marginGuardrails", "pitchMultipliers", "storyMultipliers", "tearOffRates", "permitFees", "wasteFactors"]
    has_multipliers = any(k in body for k in stored_keys)
    if has_multipliers:
        # Load existing
        settings_res = await db.execute(text("SELECT value FROM app_settings WHERE key = 'pricing_config'"))
        existing_val = settings_res.scalar_one_or_none()
        config_dict = {}
        if existing_val:
            config_dict = orjson.loads(existing_val) if isinstance(existing_val, str) else existing_val

        for k in stored_keys:
            if k in body:
                config_dict[k] = body[k]

        json_str = orjson.dumps(config_dict).decode("utf-8")
        await db.execute(
            text("""
                INSERT INTO app_settings (key, value, updated_at)
                VALUES ('pricing_config', :val, NOW())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            """),
            {"val": json_str}
        )

    action = body.get("action")
    if action == "update_pricing":
        sid = body.get("serviceId")
        if not sid:
            raise HTTPException(status_code=400, detail="Service ID is required")

        await db.execute(
            text("""
                UPDATE estimator_pricing_rules
                SET price_per_sqft_low = :low,
                    price_per_sqft_high = :high,
                    base_fee_low = :blow,
                    base_fee_high = :bhigh,
                    min_sqft = :mins,
                    max_sqft = :maxs,
                    apr_available = :apr,
                    financing_apr = :fapr,
                    financing_term_months = :term,
                    updated_at = NOW(),
                    updated_by = :by
                WHERE service_id = :sid
            """),
            {
                "low": float(body.get("pricePerSqftLow", 0)),
                "high": float(body.get("pricePerSqftHigh", 0)),
                "blow": float(body.get("baseFeeLow", 0)),
                "bhigh": float(body.get("baseFeeHigh", 0)),
                "mins": int(body.get("minSqft", 500)),
                "maxs": int(body.get("maxSqft", 12000)),
                "apr": bool(body.get("aprAvailable")),
                "fapr": float(body.get("financingApr", 0)),
                "term": int(body.get("financingTermMonths", 60)),
                "by": user.get("name") or user.get("email") or "Staff",
                "sid": int(sid)
            }
        )
        await db.commit()
        try:
            await cache_delete("crm:dashboard:stats")
            await cache_delete("estimator:config")
        except Exception:
            pass
        return {"ok": True, "message": "Pricing rules updated successfully"}

    elif action == "save_service":
        sid = body.get("id")
        name = body.get("name")
        short_label = body.get("shortLabel")
        icon_key = body.get("iconKey")
        if not name or not short_label or not icon_key:
            raise HTTPException(status_code=400, detail="Name, short label, and icon key are required")

        if sid:
            await db.execute(
                text("""
                    UPDATE estimator_services
                    SET name = :name, short_label = :slabel, icon_key = :ikey, badge_label = :badge,
                        sort_order = :sort, is_active = :act
                    WHERE id = :id
                """),
                {
                    "name": name, "slabel": short_label, "ikey": icon_key,
                    "badge": body.get("badgeLabel"), "sort": int(body.get("sortOrder", 0)),
                    "act": bool(body.get("isActive", True)), "id": int(sid)
                }
            )
        else:
            safe_slug = body.get("slug") or name.lower().replace(" ", "-")
            res = await db.execute(
                text("""
                    INSERT INTO estimator_services (slug, name, short_label, icon_key, badge_label, sort_order, is_active)
                    VALUES (:slug, :name, :slabel, :ikey, :badge, :sort, :act)
                    RETURNING id
                """),
                {
                    "slug": safe_slug, "name": name, "slabel": short_label, "ikey": icon_key,
                    "badge": body.get("badgeLabel"), "sort": int(body.get("sortOrder", 10)),
                    "act": bool(body.get("isActive", True))
                }
            )
            new_id = res.scalar()
            await db.execute(
                text("""
                    INSERT INTO estimator_pricing_rules (
                        service_id, price_per_sqft_low, price_per_sqft_high, base_fee_low, base_fee_high,
                        min_sqft, max_sqft, apr_available, financing_apr, financing_term_months, updated_by
                    ) VALUES (:sid, 4.00, 6.50, 500, 1000, 800, 8000, true, 0, 60, :by)
                """),
                {"sid": new_id, "by": user.get("name") or user.get("email") or "Staff"}
            )

        await db.commit()
        try:
            await cache_delete("crm:dashboard:stats")
            await cache_delete("estimator:config")
        except Exception:
            pass
        return {"ok": True, "message": "Service saved successfully"}

    elif action == "save_preset":
        pid = body.get("id")
        label = body.get("label")
        sqft = body.get("sqftValue")
        if not label or not sqft:
            raise HTTPException(status_code=400, detail="Label and sqft value required")

        if pid:
            await db.execute(
                text("UPDATE estimator_size_presets SET label = :lbl, sqft_value = :sqft, sort_order = :sort, service_id = :sid WHERE id = :id"),
                {"lbl": label, "sqft": int(sqft), "sort": int(body.get("sortOrder", 0)), "sid": body.get("serviceId"), "id": int(pid)}
            )
        else:
            await db.execute(
                text("INSERT INTO estimator_size_presets (service_id, label, sqft_value, sort_order) VALUES (:sid, :lbl, :sqft, :sort)"),
                {"sid": body.get("serviceId"), "lbl": label, "sqft": int(sqft), "sort": int(body.get("sortOrder", 0))}
            )
        await db.commit()
        try:
            await cache_delete("crm:dashboard:stats")
            await cache_delete("estimator:config")
        except Exception:
            pass
        return {"ok": True, "message": "Preset saved successfully"}

    elif action == "delete_preset":
        pid = body.get("id")
        if not pid:
            raise HTTPException(status_code=400, detail="Preset ID required")
        await db.execute(text("DELETE FROM estimator_size_presets WHERE id = :id"), {"id": int(pid)})
        await db.commit()
        try:
            await cache_delete("crm:dashboard:stats")
            await cache_delete("estimator:config")
        except Exception:
            pass
        return {"ok": True, "message": "Preset deleted successfully"}

    await db.commit()

    # Clear caches
    try:
        await cache_delete("crm:dashboard:stats")
        await cache_delete("estimator:config")
    except Exception:
        pass

    return {"ok": True, "message": "Estimator and formula settings updated successfully"}

@router.post("/estimator/calculate")
async def calculate_quote(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    body = await request.json()
    raw_service = str(body.get("service") or body.get("serviceSlug") or "residential").lower().strip()
    slug = SERVICE_SLUG_MAP.get(raw_service, "residential")
    sqft = float(body.get("sqft") or 0)
    if sqft <= 0 and body.get("squares"):
        sqft = float(body["squares"]) * 100.0
    if sqft <= 0:
        sqft = 2500.0

    # Query rule for slug
    rule_sql = text("""
        SELECT s.name, s.slug, r.price_per_sqft_low, r.price_per_sqft_high,
               r.base_fee_low, r.base_fee_high, r.financing_apr, r.financing_term_months
        FROM estimator_services s
        JOIN estimator_pricing_rules r ON s.id = r.service_id
        WHERE s.slug = :slug
    """)
    res = (await db.execute(rule_sql, {"slug": slug})).mappings().first()
    if not res:
        # Fallback to residential
        res = (await db.execute(rule_sql, {"slug": "residential"})).mappings().first()

    low = round(float(res["base_fee_low"]) + (sqft * float(res["price_per_sqft_low"])))
    high = round(float(res["base_fee_high"]) + (sqft * float(res["price_per_sqft_high"])))
    midpoint = round((low + high) / 2)
    term = int(res["financing_term_months"] or 60)
    monthly_low = round(low / term)
    monthly_high = round(high / term)

    return {
        "ok": True,
        "service": res["name"],
        "slug": res["slug"],
        "sqft": sqft,
        "squares": round(sqft / 100, 1),
        "estimateLow": low,
        "estimateHigh": high,
        "estimateMidpoint": midpoint,
        "monthlyLow": monthly_low,
        "monthlyHigh": monthly_high,
        "financingTermMonths": term,
    }
