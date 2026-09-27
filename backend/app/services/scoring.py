import re
from typing import Dict, Any, List, Tuple

PRIMARY_CITIES = [
    "escondido", "oceanside", "carlsbad", "san marcos", "vista",
    "encinitas", "poway", "rancho bernardo", "temecula", "murrieta"
]

def calculate_lead_score(data: Dict[str, Any]) -> Tuple[int, str, List[str]]:
    """
    Auto-scores inbound leads from 0 to 100 based on intent, project scope,
    service urgency, and geographic fit in San Diego & Riverside Counties.
    Returns: (score, priority, factors)
    """
    score = 0
    factors: List[str] = []

    s_type = (data.get("serviceType") or "").lower()
    if any(k in s_type for k in ["repair", "leak", "emergency"]):
        score += 45
        factors.append("Emergency or active leak repair (+45)")
    elif any(k in s_type for k in ["residential", "tile", "shingle"]):
        score += 35
        factors.append("High-ticket full roof replacement (+35)")
    elif any(k in s_type for k in ["commercial", "tpo"]):
        score += 40
        factors.append("Commercial project (+40)")
    elif "solar" in s_type:
        score += 30
        factors.append("Solar + roofing combination (+30)")
    elif s_type:
        score += 15
        factors.append("Service requested (+15)")

    if data.get("formType") == "estimate":
        score += 20
        factors.append("Interactive estimate submitted (+20)")

    phone = data.get("phone") or ""
    clean_digits = re.sub(r"\D", "", phone)
    if len(clean_digits) >= 10:
        score += 20
        factors.append("Direct phone number provided (+20)")

    roof_sqf = float(data.get("roofSqf") or 0)
    if roof_sqf >= 2500:
        score += 15
        factors.append(f"Large roof area ({int(roof_sqf):,} sq ft) (+15)")
    elif roof_sqf > 0:
        score += 10
        factors.append("Roof area specified (+10)")

    addr = f"{data.get('address') or ''} {data.get('zip') or ''}".lower()
    if any(city in addr for city in PRIMARY_CITIES):
        score += 10
        factors.append("Primary North County / Local service area (+10)")

    source = (data.get("leadSource") or "").lower()
    if "referral" in source or "repeat" in source:
        score += 25
        factors.append("Referral or repeat client (+25)")
    elif "phone" in source or "call" in source:
        score += 15
        factors.append("Direct telephone inbound (+15)")

    score = min(100, max(0, score))

    priority = "cool"
    if score >= 70:
        priority = "hot"
    elif score >= 35:
        priority = "warm"

    return score, priority, factors
