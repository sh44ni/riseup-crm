from typing import Dict, List, Any, Optional
from math import floor, ceil

ROOFING_MATERIALS = [
    {
        "id": "oc_duration",
        "name": "Owens Corning Duration® Shingles",
        "category": "shingle",
        "materialCostPerSq": 175,
        "laborCostPerSq": 225,
        "warrantyYears": 50,
        "description": "SureNail® technology, 130 MPH wind warranty, Owens Corning Preferred installation",
    },
    {
        "id": "eagle_tile",
        "name": "Eagle Concrete Tile (Tile Relay / New Tile)",
        "category": "tile",
        "materialCostPerSq": 260,
        "laborCostPerSq": 295,
        "warrantyYears": 50,
        "description": "Class A fire-rated, dual-layer synthetic underlayment, custom eave closures",
    },
    {
        "id": "clay_tile",
        "name": "Authentic Spanish Clay Tile",
        "category": "tile",
        "materialCostPerSq": 395,
        "laborCostPerSq": 345,
        "warrantyYears": 75,
        "description": "Timeless Southern California mission aesthetic, superior thermal resistance",
    },
    {
        "id": "tpo_commercial",
        "name": "Commercial TPO Single-Ply Membrane (60-mil)",
        "category": "commercial",
        "materialCostPerSq": 210,
        "laborCostPerSq": 265,
        "warrantyYears": 25,
        "description": "Heat-welded seams, high solar reflectance (Title 24 compliant), leak-proof flat roof",
    },
    {
        "id": "standing_seam",
        "name": "Architectural Standing Seam Metal",
        "category": "metal",
        "materialCostPerSq": 430,
        "laborCostPerSq": 390,
        "warrantyYears": 50,
        "description": "Concealed fasteners, Kynar 500 finish, modern architectural aesthetic",
    },
]

PITCH_MULTIPLIERS: Dict[str, float] = {
    "4:12": 1.0,
    "5:12": 1.03,
    "6:12": 1.07,
    "7:12": 1.12,
    "8:12": 1.18,
    "9:12": 1.25,
    "10:12+": 1.35,
}

STORY_MULTIPLIERS: Dict[int, float] = {
    1: 1.0,
    2: 1.1,
    3: 1.25,
}

TEAROFF_COSTS_PER_SQ: Dict[int, int] = {
    0: 0,
    1: 45,
    2: 85,
}

DEFAULT_ADDONS: List[Dict[str, Any]] = [
    {"id": "plywood", "name": "4x8 CDX Plywood Sheathing", "unit": "sheet", "unitPrice": 95},
    {"id": "dryrot_fascia", "name": "Fascia Board / Dry Rot Repair", "unit": "LF", "unitPrice": 28},
    {"id": "gutters", "name": "Seamless 5\" Aluminum Gutters", "unit": "LF", "unitPrice": 18},
    {"id": "skylight", "name": "Velux Deck-Mounted Skylight", "unit": "unit", "unitPrice": 1250},
    {"id": "vents", "name": "O'Hagin Attic Vents", "unit": "unit", "unitPrice": 165},
    {"id": "solar_detach", "name": "Solar Panel Detach & Reset", "unit": "panel", "unitPrice": 185},
    {"id": "permit", "name": "City Building Permit & Inspection", "unit": "flat", "unitPrice": 650},
    {"id": "dumpster", "name": "Dumpster Haul-Away & Disposal", "unit": "flat", "unitPrice": 850},
]

def calculate_roof_estimate(data: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    if data and isinstance(data, dict):
        merged.update(data)
    merged.update(kwargs)

    squares = max(1.0, float(merged.get("roof_squares") or merged.get("roofSquares") or 20.0))
    mat_id = str(merged.get("material_id") or merged.get("materialId") or "oc_duration")
    material = next((m for m in ROOFING_MATERIALS if m["id"] == mat_id), ROOFING_MATERIALS[0])

    pitch = str(merged.get("pitch") or merged.get("roof_pitch") or "4:12")
    pitch_mult = PITCH_MULTIPLIERS.get(pitch, 1.0)

    stories = int(merged.get("stories") or 1)
    story_mult = STORY_MULTIPLIERS.get(stories, 1.0)

    tearoff_layers = int(merged.get("tearoff_layers") if merged.get("tearoff_layers") is not None else merged.get("tearoffLayers", 1))
    tearoff_rate = TEAROFF_COSTS_PER_SQ.get(tearoff_layers, 45)

    # Base materials
    material_subtotal = round(squares * material["materialCostPerSq"])

    # Labor factoring pitch & stories
    adjusted_labor_per_sq = material["laborCostPerSq"] * pitch_mult * story_mult
    labor_subtotal = round(squares * adjusted_labor_per_sq)

    # Tear-off
    tearoff_subtotal = round(squares * tearoff_rate)

    # Addons
    addons_subtotal = 0
    addons_detail = []
    incoming_addons = merged.get("addons") or []
    for add in incoming_addons:
        qty = float(add.get("quantity") or 0)
        if qty <= 0:
            continue
        add_id = add.get("id")
        def_item = next((d for d in DEFAULT_ADDONS if d["id"] == add_id), None)
        unit_price = float(add.get("unitPrice") or (def_item["unitPrice"] if def_item else 0))
        name = add.get("name") or (def_item["name"] if def_item else add_id)
        unit = def_item["unit"] if def_item else "item"
        cost = round(unit_price * qty)
        addons_subtotal += cost
        addons_detail.append({
            "id": add_id,
            "name": name,
            "unit": unit,
            "unitPrice": unit_price,
            "quantity": qty,
            "total": cost,
        })

    cost_subtotal = material_subtotal + labor_subtotal + tearoff_subtotal + addons_subtotal

    # Margin: Price = Cost / (1 - Margin)
    margin_pct = float(merged.get("margin_pct") if merged.get("margin_pct") is not None else merged.get("marginPct", 30.0))
    margin_fraction = max(0.05, min(0.60, margin_pct / 100.0))
    total_price = round(cost_subtotal / (1.0 - margin_fraction))

    # Financing: 0% APR promo over X months
    financing_months = int(merged.get("financing_months") or merged.get("financingMonths") or 60)
    monthly_payment = round(total_price / financing_months)

    return {
        "squares": squares,
        "material": material,
        "material_subtotal": material_subtotal,
        "materialSubtotal": material_subtotal,
        "labor_subtotal": labor_subtotal,
        "laborSubtotal": labor_subtotal,
        "tearoff_subtotal": tearoff_subtotal,
        "tearoffSubtotal": tearoff_subtotal,
        "addons_subtotal": addons_subtotal,
        "addonsSubtotal": addons_subtotal,
        "cost_subtotal": cost_subtotal,
        "costSubtotal": cost_subtotal,
        "margin_pct": margin_pct,
        "marginPct": margin_pct,
        "total_price": total_price,
        "totalPrice": total_price,
        "monthly_payment": monthly_payment,
        "monthlyPayment": monthly_payment,
        "addons_detail": addons_detail,
        "addonsDetail": addons_detail,
    }


FALLBACK_SERVICE_RATES: Dict[str, Dict[str, Any]] = {
    "residential": {
        "price_per_sqft_low": 4.00,
        "price_per_sqft_high": 6.20,
        "base_fee_low": 500.0,
        "base_fee_high": 950.0,
        "term_months": 60,
    },
    "repair": {
        "price_per_sqft_low": 0.40,
        "price_per_sqft_high": 0.80,
        "base_fee_low": 100.0,
        "base_fee_high": 600.0,
        "term_months": 18,
    },
    "commercial": {
        "price_per_sqft_low": 5.00,
        "price_per_sqft_high": 8.00,
        "base_fee_low": 2250.0,
        "base_fee_high": 4000.0,
        "term_months": 60,
    },
    "solar": {
        "price_per_sqft_low": 7.50,
        "price_per_sqft_high": 11.50,
        "base_fee_low": 1500.0,
        "base_fee_high": 3000.0,
        "term_months": 120,
    },
}

SERVICE_ALIAS_MAP: Dict[str, str] = {
    "residential": "residential",
    "tile": "residential",
    "shingle": "residential",
    "replacement": "residential",
    "tile / shingle": "residential",
    "tile / shingle roof": "residential",
    "concrete / spanish tile relay & reset": "residential",
    "asphalt & architectural shingle": "residential",
    "spanish clay tile": "residential",
    "concrete tile": "residential",
    "repair": "repair",
    "leak": "repair",
    "leak & tile repair": "repair",
    "emergency roof leak repair": "repair",
    "commercial": "commercial",
    "commercial flat": "commercial",
    "commercial flat roof": "commercial",
    "commercial flat roofing": "commercial",
    "flat": "commercial",
    "tpo": "commercial",
    "solar": "solar",
    "solar + roofing": "solar",
    "solar detach & reset (r&r)": "solar",
}

def resolve_service_slug(service_name_or_slug: Optional[str]) -> str:
    if not service_name_or_slug:
        return "residential"
    s = service_name_or_slug.strip().lower()
    for pattern, slug in SERVICE_ALIAS_MAP.items():
        if pattern in s:
            return slug
    return "residential"

def calculate_lead_estimated_value(
    sqft: float,
    service_type: Optional[str] = None,
    pitch: Optional[str] = None,
    stories: int = 1,
    db_rule: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Computes low, high, and midpoint estimated value for a lead or deal based on roof size and service type.
    Formula:
      low = base_fee_low + sqft * price_per_sqft_low
      high = base_fee_high + sqft * price_per_sqft_high
      midpoint = (low + high) / 2
    Factors pitch and stories multipliers if specified.
    """
    sqft = max(100.0, float(sqft or 2500.0))
    slug = resolve_service_slug(service_type)
    
    rule = db_rule or FALLBACK_SERVICE_RATES.get(slug, FALLBACK_SERVICE_RATES["residential"])
    
    p_low = float(rule.get("price_per_sqft_low", 4.0))
    p_high = float(rule.get("price_per_sqft_high", 6.2))
    b_low = float(rule.get("base_fee_low", 500.0))
    b_high = float(rule.get("base_fee_high", 950.0))
    term = int(rule.get("financing_term_months") or rule.get("term_months") or 60)

    pitch_mult = PITCH_MULTIPLIERS.get(str(pitch), 1.0)
    story_mult = STORY_MULTIPLIERS.get(int(stories or 1), 1.0)
    multiplier = pitch_mult * story_mult

    low = round((b_low + (sqft * p_low)) * multiplier)
    high = round((b_high + (sqft * p_high)) * multiplier)
    midpoint = round((low + high) / 2.0)
    monthly_low = round(low / term)
    monthly_high = round(high / term)

    return {
        "sqft": sqft,
        "squares": round(sqft / 100.0, 1),
        "service_slug": slug,
        "estimate_low": low,
        "estimate_high": high,
        "estimated_value": midpoint,
        "monthly_low": monthly_low,
        "monthly_high": monthly_high,
        "financing_term_months": term,
    }

