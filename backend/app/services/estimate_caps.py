"""Shared constants for the Two Options Estimate template.

These caps are measured against the rendered template at 816x1056px (8.5x11in @ 96dpi).
Both the wizard (frontend) and the template renderer (backend) use these values.
"""

# Field character caps - hard limits enforced at input time
FIELD_CAPS = {
    "plan_name": 28,
    "plan_subtitle": 30,
    "price_badge_label": 24,
    "price_max": 999_999,
    "price_min": 0,
    "scope_item_text": 85,
    "scope_items_min": 5,
    "scope_items_max": 11,
    "warranty_chip": 28,
    "addon_title": 60,
    "addon_description": 240,
    "addon_price_max": 999_999,
    "important_note": 200,
    "lock_in_days_min": 1,
    "lock_in_days_max": 90,
    "client_email": 45,
}

# Company timezone for date display
COMPANY_TIMEZONE = "America/Los_Angeles"

# Default important note template
DEFAULT_IMPORTANT_NOTE = (
    'These special "Lock-In" prices are valid when you schedule within {N} days '
    'from the date of this proposal. Work does not need to be completed within the {N}-day period.'
)

# Default plan A content
DEFAULT_PLAN_A = {
    "name": "TILE ROOF LIFT & RELAY",
    "subtitle": "REUSE EXISTING TILES",
    "price_badge_label": "INCLUDED UNDERLAYMENT",
    "price": 26870,
    "scope_items": [
        "Remove and carefully stage existing roof tiles for reuse.",
        "Remove and dispose of existing underlayment.",
        "Inspect decking and replace up to 3 sheets of plywood as needed.",
        "Install new tile roof underlayment.",
        "Install new flashings, drip edge metal, valley metals, and other necessary metals.",
        "Reinstall existing roof tiles.",
        "Replace broken or unusable tiles up to 10% of existing tiles.",
        "Reseal all roof vents and penetrations.",
        "Paint vent components to match existing tile color.",
        "Clean up and remove all debris.",
        "Final inspection and quality walkthrough.",
    ],
    "warranty_chips": ["10 YEAR WORKMANSHIP", "30 YEAR MANUFACTURER"],
}

# Default plan B content  
DEFAULT_PLAN_B = {
    "name": "COMPLETE NEW TILE ROOF SYSTEM",
    "subtitle": "100% NEW TILE INSTALLATION",
    "price_badge_label": "INCLUDED UNDERLAYMENT",
    "price": 32410,
    "scope_items": [
        "Remove and dispose of 100% of existing roof tiles.",
        "Remove and dispose of existing underlayment.",
        "Inspect decking and replace up to 4 sheets of plywood as needed.",
        "Install new tile roof underlayment.",
        "Install new flashings, drip edge metal, valley metals, and other necessary metals.",
        "Install 100% brand-new roof tiles (homeowner to select style & color).",
        "Properly install and secure new tile roofing system.",
        "Reseal all roof vents and penetrations.",
        "Paint vent components to match new tile color.",
        "Clean up and remove all debris.",
        "Final inspection and quality walkthrough.",
    ],
    "warranty_chips": ["10 YEAR WORKMANSHIP", "30 YEAR MANUFACTURER"],
}

# Default add-ons
DEFAULT_ADDON_1 = {
    "title": "PREMIUM PSU / PEEL-AND-STICK (TILESEAL) UNDERLAYMENT UPGRADE",
    "description": (
        "Upgrade the standard underlayment to a premium self-adhered peel-and-stick system, "
        "such as TileSeal or approved equivalent. Provides a fully adhered secondary "
        "water-resistant barrier and improved sealing around fastener penetrations."
    ),
    "price": 2000,
    "price_prefix": "+",
    "icon_mode": "builtin",
    "builtin_icon_id": "underlayment",
}

DEFAULT_ADDON_2 = {
    "title": "PRESSURE WASHING ADD-ON",
    "description": (
        "Professional soft wash of roof tiles, exterior surfaces, walkways, "
        "and driveway to remove dirt, mold, mildew, and algae."
    ),
    "price": 3500,
    "price_prefix": "",
    "icon_mode": "builtin",
    "builtin_icon_id": "pressure_washer",
}

# Default pricing
DEFAULT_PRICING = {
    "lock_in_days": 20,
    "standard_prices": [31500, 37200],
    "important_note": DEFAULT_IMPORTANT_NOTE,
}


def format_price(amount: int | float) -> str:
    """Format money as $26,870 with commas, no decimals unless cents exist."""
    if amount == int(amount):
        return f"${int(amount):,}"
    return f"${amount:,.2f}"


def validate_field_cap(field_name: str, value: str) -> tuple[bool, str]:
    """Validate a string field against its cap. Returns (is_valid, error_message)."""
    cap = FIELD_CAPS.get(field_name)
    if cap is None:
        return True, ""
    if len(value) > cap:
        return False, f"{field_name} exceeds maximum length of {cap} characters (got {len(value)})"
    return True, ""


def validate_estimate_data(data: dict) -> list[str]:
    """Validate a TwoOptionsEstimate data dict. Returns list of error messages."""
    errors = []
    
    # Required fields
    if not data.get("client", {}).get("leadId"):
        errors.append("Client selection is required")
    if not data.get("photo1"):
        errors.append("Photo 1 is required")
    if not data.get("proposalDate"):
        errors.append("Proposal date is required")
    
    # Validate plans
    plans = data.get("plans", [])
    for i, plan in enumerate(plans):
        label = f"Plan {'A' if i == 0 else 'B'}"
        if not plan.get("name"):
            errors.append(f"{label} name is required")
        elif len(plan["name"]) > FIELD_CAPS["plan_name"]:
            errors.append(f"{label} name exceeds {FIELD_CAPS['plan_name']} characters")
        
        price = plan.get("price", 0)
        if price < FIELD_CAPS["price_min"] or price > FIELD_CAPS["price_max"]:
            errors.append(f"{label} price must be between ${FIELD_CAPS['price_min']:,} and ${FIELD_CAPS['price_max']:,}")
        
        items = plan.get("scopeItems", [])
        if len(items) < FIELD_CAPS["scope_items_min"]:
            errors.append(f"{label} needs at least {FIELD_CAPS['scope_items_min']} scope items")
        if len(items) > FIELD_CAPS["scope_items_max"]:
            errors.append(f"{label} cannot exceed {FIELD_CAPS['scope_items_max']} scope items")
    
    # Validate add-ons
    addons = data.get("addons", [])
    for i, addon in enumerate(addons):
        label = f"Add-on {i + 1}"
        if not addon.get("title"):
            errors.append(f"{label} title is required")
        if addon.get("price") is None:
            errors.append(f"{label} price is required")
    
    # Validate pricing
    pricing = data.get("pricing", {})
    days = pricing.get("lockInDays", 0)
    if days < FIELD_CAPS["lock_in_days_min"] or days > FIELD_CAPS["lock_in_days_max"]:
        errors.append(f"Lock-in days must be between {FIELD_CAPS['lock_in_days_min']} and {FIELD_CAPS['lock_in_days_max']}")
    
    return errors
