from app.core.logger import get_logger
import os
import base64
import secrets
from typing import Dict, Any
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from playwright.async_api import async_playwright

TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates", "estimates"))
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "static"))
STATIC_UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads", "estimates")

os.makedirs(STATIC_UPLOADS_DIR, exist_ok=True)

jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)

def _format_price(value):
    try:
        if value is None or value == "" or "Undefined" in type(value).__name__:
            return "$0"
        if isinstance(value, str):
            value = value.strip().replace("$", "").replace(",", "")
        if not value:
            return "$0"
        v = float(value)
        sign = "-" if v < 0 else ""
        v = abs(v)
        if v == int(v):
            return f"{sign}${int(v):,}"
        return f"{sign}${v:,.2f}"
    except Exception:
        return "$0"
jinja_env.filters['format_price'] = _format_price

import mimetypes

def _to_data_uri(path_or_url: str) -> str:
    if not path_or_url:
        return path_or_url
    if path_or_url.startswith("data:") or path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        return path_or_url
    
    clean = path_or_url.lstrip("/")
    real_static_dir = os.path.realpath(STATIC_DIR)
    # Check possible relative locations
    candidate_paths = [
        os.path.join(STATIC_DIR, clean.replace("static/", "", 1) if clean.startswith("static/") else clean),
        os.path.join(STATIC_DIR, "images", "estimates", os.path.basename(clean)),
        os.path.join(STATIC_DIR, clean),
    ]
    for p in candidate_paths:
        resolved_p = os.path.realpath(p)
        if resolved_p.startswith(real_static_dir) and os.path.exists(resolved_p) and os.path.isfile(resolved_p):
            mime, _ = mimetypes.guess_type(resolved_p)
            mime = mime or "image/jpeg"
            try:
                with open(resolved_p, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                return f"data:{mime};base64,{b64}"
            except Exception:
                pass
    return path_or_url

# Default high-res house fallback image (Photo 1)
DEFAULT_HOUSE_IMAGE = "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80"
DEFAULT_UNDERLAYMENT_IMAGE = "/static/images/estimates/underlayment_roll.jpg"
DEFAULT_PRESSURE_WASHER_IMAGE = "/static/images/estimates/pressure_washer.jpg"

DEFAULT_PROPOSAL_DATA = {
    "proposal_date": datetime.now().strftime("%m/%d/%Y"),
    "customer_name": "",
    "customer_address": "",
    "customer_city": "",
    "roof_squares": 25.0,
    "roof_pitch": "4:12 Pitch",
    "stories": "1 Story",
    "hero_photo_url": DEFAULT_HOUSE_IMAGE,
    "option_a": {
        "title": "TILE ROOF LIFT & RELAY",
        "subtitle": "REUSE EXISTING TILES",
        "lock_in_price": 26870,
        "standard_price": 31500,
        "warranty": "10 YEAR WORKMANSHIP | 30 YEAR MANUFACTURER",
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
        ]
    },
    "option_b": {
        "title": "COMPLETE NEW TILE ROOF SYSTEM",
        "subtitle": "100% NEW TILE INSTALLATION",
        "lock_in_price": 32410,
        "standard_price": 37200,
        "warranty": "10 YEAR WORKMANSHIP | 30 YEAR MANUFACTURER",
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
        ]
    },
    "addon_1": {
        "title": "PREMIUM PSU / PEEL-AND-STICK (TILESEAL) UNDERLAYMENT UPGRADE",
        "description": "Upgrade the standard underlayment to a premium self-adhered peel-and-stick system, such as TileSeal or approved equivalent. Provides a fully adhered secondary water-resistant barrier and improved sealing around fastener penetrations.",
        "price": 2000,
        "image_url": DEFAULT_UNDERLAYMENT_IMAGE,
    },
    "addon_2": {
        "title": "PRESSURE WASHING ADD-ON",
        "description": "Professional soft wash of roof tiles, exterior surfaces, walkways, and driveway to remove dirt, mold, mildew, and algae.",
        "price": 3500,
        "image_url": DEFAULT_PRESSURE_WASHER_IMAGE,
    }
}

def merge_proposal_defaults(user_data: Dict[str, Any]) -> Dict[str, Any]:
    merged = dict(DEFAULT_PROPOSAL_DATA)
    if not user_data:
        return merged

    for key, val in user_data.items():
        if isinstance(val, dict) and key in merged and isinstance(merged[key], dict):
            sub_merged = dict(merged[key])
            sub_merged.update(val)
            merged[key] = sub_merged
        else:
            merged[key] = val
    return merged

TEMPLATE_MAP = {
    "multi_option_proposal": "multi_option_proposal.html",
    "standard_roofing_estimate": "standard_roofing_estimate.html",
    "two_options_estimate": "two_options_estimate.html",
}

async def render_proposal_html(proposal_data: Dict[str, Any], template_key: str = "multi_option_proposal") -> str:
    if template_key == "two_options_estimate":
        return await render_two_options_html(proposal_data, settings={}, for_preview=False)

    merged = merge_proposal_defaults(proposal_data)
    
    # Process Photos 1, 2, and 3 into data URIs for 100% offline self-contained PDF rendering
    if merged.get("hero_photo_url"):
        merged["hero_photo_url"] = _to_data_uri(merged["hero_photo_url"])
        
    if "addon_1" in merged and isinstance(merged["addon_1"], dict):
        img_val = merged["addon_1"].get("image_url") or merged["addon_1"].get("imageUrl") or DEFAULT_UNDERLAYMENT_IMAGE
        merged["addon_1"]["image_url"] = _to_data_uri(img_val)
        merged["addon_1"]["imageUrl"] = merged["addon_1"]["image_url"]
        
    if "addon_2" in merged and isinstance(merged["addon_2"], dict):
        img_val = merged["addon_2"].get("image_url") or merged["addon_2"].get("imageUrl") or DEFAULT_PRESSURE_WASHER_IMAGE
        merged["addon_2"]["image_url"] = _to_data_uri(img_val)
        merged["addon_2"]["imageUrl"] = merged["addon_2"]["image_url"]

    template_file = TEMPLATE_MAP.get(template_key, "multi_option_proposal.html")
    template = jinja_env.get_template(template_file)
    return template.render(proposal=merged)


import re
from app.services.estimate_caps import DEFAULT_PLAN_A, DEFAULT_PLAN_B, DEFAULT_ADDON_1, DEFAULT_ADDON_2, DEFAULT_PRICING

def _embed_fonts_as_data_uris(html: str) -> str:
    """Replace @font-face url() references with inline base64 data URIs."""
    def repl(m):
        font_path = m.group(1).strip("'\"")
        clean_path = font_path.lstrip("/")
        full_path = os.path.join(STATIC_DIR, clean_path.replace("static/", "", 1) if clean_path.startswith("static/") else clean_path)
        if os.path.exists(full_path):
            with open(full_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"url('data:font/woff2;charset=utf-8;base64,{b64}')"
        return m.group(0)
    return re.sub(r"url\(([^)]+\.woff2)\)", repl, html)

def _split_address(addr: str):
    if not addr:
        return ("", "")
    if "\n" in addr:
        parts = addr.split("\n", 1)
        return (parts[0].strip(), parts[1].strip())
    parts = [p.strip() for p in addr.split(",") if p.strip()]
    if len(parts) >= 3:
        line1 = ", ".join(parts[:-1]) + ","
        line2 = parts[-1]
        return (line1, line2)
    elif len(parts) == 2:
        return (parts[0] + ",", parts[1])
    return (addr, "")

def _extract_warranties(chips) -> tuple:
    work = "30 YEAR"
    mfg = "30 YEAR"
    if not chips or not isinstance(chips, list):
        return (work, mfg)
    for c in chips:
        s = str(c).upper()
        if "WORKMANSHIP" in s or "LABOR" in s:
            val = re.sub(r"\s*(WORKMANSHIP|LABOR).*", "", s).strip()
            work = val if ("YEAR" in val or "YR" in val) else f"{val} YEAR" if val else "30 YEAR"
        elif "MANUFACTURER" in s or "MFG" in s or "MATERIAL" in s:
            val = re.sub(r"\s*(MANUFACTURER|MFG|MATERIAL).*", "", s).strip()
            mfg = val if ("YEAR" in val or "YR" in val) else f"{val} YEAR" if val else "30 YEAR"
    return (work, mfg)

def build_two_options_context(proposal_data: dict, db_settings: dict) -> dict:
    company = db_settings.get("company_profile", {})
    if not isinstance(company, dict):
        company = {}
        
    proposal_data = proposal_data or {}
    
    # 1. Company
    company_name = company.get('dba') or company.get('legalName') or 'Rise Up Roofing & Construction'
    raw_comp_addr = company.get('hqAddress') or '2182 S El Camino Real, Ste 202, Oceanside, CA 92054'
    comp_addr1, comp_addr2 = _split_address(raw_comp_addr)
    company_phone = company.get('publicPhone') or '(760) 622-1230'
    company_email = company.get('primaryEmail') or 'marc@riseuprac.com'
    company_website = company.get('websiteUrl') or 'https://riseuprac.com'
    
    # Logo Data URI
    logo_data_uri = ""
    REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    logo_candidates = [
        os.path.join(REPO_ROOT, 'branding2.0', 'logo_logo_for_estimates.svg'),
        os.path.join(REPO_ROOT, 'branding2.0', 'logo_for_estimates.svg'),
        os.path.join(REPO_ROOT, 'branding', 'logo_logo_for_estimates.svg'),
        os.path.join(REPO_ROOT, 'branding', 'logo_for_estimates.svg'),
        os.path.join(REPO_ROOT, 'crm', 'public', 'logo.svg'),
        os.path.join(STATIC_DIR, 'images', 'estimates', 'riseup_arch_logo.svg'),
        os.path.join(REPO_ROOT, 'branding2.0', 'logo_logo_for_light_bg.svg'),
        os.path.join(STATIC_DIR, 'images', 'logo.svg')
    ]
    for lp in logo_candidates:
        if os.path.exists(lp):
            with open(lp, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            logo_data_uri = f"data:image/svg+xml;base64,{b64}"
            break
            
    # 2. Date
    raw_date = proposal_data.get("proposalDate") or proposal_data.get("proposal_date")
    if raw_date:
        try:
            if "T" in str(raw_date):
                dt = datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
            else:
                dt = datetime.strptime(str(raw_date)[:10], "%Y-%m-%d")
            proposal_date = f"{dt.month}/{dt.day}/{dt.year}"
        except Exception:
            proposal_date = str(raw_date)
    else:
        now = datetime.now()
        proposal_date = f"{now.month}/{now.day}/{now.year}"
        
    # 3. Client Details
    client = proposal_data.get("client") or {}
    raw_client_addr = (
        client.get("property")
        or client.get("address")
        or proposal_data.get("customer_address")
        or ""
    ).strip()
    cust_city = (client.get("city") or proposal_data.get("customer_city") or "").strip()
    if raw_client_addr and cust_city and cust_city.lower() not in raw_client_addr.lower():
        full_addr_str = f"{raw_client_addr}, {cust_city}"
    else:
        full_addr_str = raw_client_addr or cust_city

    if full_addr_str:
        client_addr1, client_addr2 = _split_address(full_addr_str)
    else:
        client_addr1, client_addr2 = ("[Address Pending]", "")

    raw_phone = client.get("phone") or proposal_data.get("customer_phone")
    client_phone = str(raw_phone).strip() if raw_phone else "[Phone Pending]"

    raw_email = client.get("email") or proposal_data.get("customer_email")
    client_email = str(raw_email).strip() if raw_email else "[Email Pending]"
    
    # 4. Photos
    photo1_raw = proposal_data.get("photo1")
    photo1_x = 0
    photo1_y = 0
    photo1_zoom = 1.0
    if isinstance(photo1_raw, dict):
        photo1_url = photo1_raw.get("url") or DEFAULT_HOUSE_IMAGE
        photo1_x = photo1_raw.get("x")
        if photo1_x is None:
            photo1_x = photo1_raw.get("position", {}).get("x", 0)
        photo1_y = photo1_raw.get("y")
        if photo1_y is None:
            photo1_y = photo1_raw.get("position", {}).get("y", 0)
        photo1_zoom = photo1_raw.get("zoom") or 1.0
    elif isinstance(photo1_raw, str) and photo1_raw:
        photo1_url = photo1_raw
    else:
        photo1_url = proposal_data.get("hero_photo_url") or DEFAULT_HOUSE_IMAGE
    hero_photo_url = _to_data_uri(photo1_url)
    
    photo2_raw = proposal_data.get("photo2") or {}
    photo2_x = 0
    photo2_y = 0
    photo2_zoom = 1.0
    if isinstance(photo2_raw, dict) and photo2_raw.get("mode") == "upload" and photo2_raw.get("asset", {}).get("url"):
        asset = photo2_raw.get("asset") or {}
        page2_photo_url = _to_data_uri(asset.get("url"))
        photo2_x = asset.get("x")
        if photo2_x is None:
            photo2_x = asset.get("position", {}).get("x", 0)
        photo2_y = asset.get("y")
        if photo2_y is None:
            photo2_y = asset.get("position", {}).get("y", 0)
        photo2_zoom = asset.get("zoom") or 1.0
    elif isinstance(photo2_raw, str) and photo2_raw:
        page2_photo_url = _to_data_uri(photo2_raw)
    else:
        page2_photo_url = hero_photo_url
        photo2_x = photo1_x
        photo2_y = photo1_y
        photo2_zoom = photo1_zoom
        
    # 5. Plans A & B
    plans_list = proposal_data.get("plans") or []
    plan_a_raw = plans_list[0] if len(plans_list) > 0 else (proposal_data.get("plan_a") or proposal_data.get("option_a") or {})
    plan_b_raw = plans_list[1] if len(plans_list) > 1 else (proposal_data.get("plan_b") or proposal_data.get("option_b") or {})
    
    w_work_a, w_mfg_a = _extract_warranties(plan_a_raw.get("warrantyChips") or plan_a_raw.get("warranty_chips"))
    w_work_b, w_mfg_b = _extract_warranties(plan_b_raw.get("warrantyChips") or plan_b_raw.get("warranty_chips"))

    plan_a = {
        "letter": "A",
        "name": plan_a_raw.get("name") or plan_a_raw.get("title") or DEFAULT_PLAN_A["name"],
        "subtitle": plan_a_raw.get("subtitle") or DEFAULT_PLAN_A["subtitle"],
        "price_badge_label": plan_a_raw.get("priceBadgeLabel") or plan_a_raw.get("price_badge_label") or DEFAULT_PLAN_A["price_badge_label"],
        "price": plan_a_raw.get("price") if plan_a_raw.get("price") is not None else (plan_a_raw.get("lock_in_price") if plan_a_raw.get("lock_in_price") is not None else DEFAULT_PLAN_A["price"]),
        "scope_items": plan_a_raw.get("scopeItems") or plan_a_raw.get("scope_items") or DEFAULT_PLAN_A["scope_items"],
        "warranty_workmanship": w_work_a,
        "warranty_manufacturer": w_mfg_a,
    }
    
    plan_b = {
        "letter": "B",
        "name": plan_b_raw.get("name") or plan_b_raw.get("title") or DEFAULT_PLAN_B["name"],
        "subtitle": plan_b_raw.get("subtitle") or DEFAULT_PLAN_B["subtitle"],
        "price_badge_label": plan_b_raw.get("priceBadgeLabel") or plan_b_raw.get("price_badge_label") or DEFAULT_PLAN_B["price_badge_label"],
        "price": plan_b_raw.get("price") if plan_b_raw.get("price") is not None else (plan_b_raw.get("lock_in_price") if plan_b_raw.get("lock_in_price") is not None else DEFAULT_PLAN_B["price"]),
        "scope_items": plan_b_raw.get("scopeItems") or plan_b_raw.get("scope_items") or DEFAULT_PLAN_B["scope_items"],
        "warranty_workmanship": w_work_b,
        "warranty_manufacturer": w_mfg_b,
    }
    
    # 6. Addons
    addons_list = proposal_data.get("addons") or []
    addon1_raw = addons_list[0] if len(addons_list) > 0 else (proposal_data.get("addon_1") or {})
    addon2_raw = addons_list[1] if len(addons_list) > 1 else (proposal_data.get("addon_2") or {})
    
    # Resolve addon image: uploaded image takes priority, then builtin icon, then default
    def _resolve_addon_image(addon_raw, default_image):
        icon_mode = addon_raw.get("iconMode") or "builtin"
        uploaded = addon_raw.get("uploadedImage")
        if icon_mode == "upload" and isinstance(uploaded, dict) and uploaded.get("url"):
            return _to_data_uri(uploaded["url"])
        # Legacy support: direct image_url field
        legacy_url = addon_raw.get("image_url") or addon_raw.get("imageUrl")
        if legacy_url:
            return _to_data_uri(legacy_url)
        return _to_data_uri(default_image)

    addon_1 = {
        "title": addon1_raw.get("title") or DEFAULT_ADDON_1["title"],
        "description": addon1_raw.get("description") or DEFAULT_ADDON_1["description"],
        "price": addon1_raw.get("price") if addon1_raw.get("price") is not None else DEFAULT_ADDON_1["price"],
        "price_prefix": addon1_raw.get("pricePrefix") if addon1_raw.get("pricePrefix") is not None else (addon1_raw.get("price_prefix") if addon1_raw.get("price_prefix") is not None else DEFAULT_ADDON_1.get("price_prefix", "+")),
        "image_url": _resolve_addon_image(addon1_raw, DEFAULT_UNDERLAYMENT_IMAGE),
    }
    
    addon_2 = {
        "title": addon2_raw.get("title") or DEFAULT_ADDON_2["title"],
        "description": addon2_raw.get("description") or DEFAULT_ADDON_2["description"],
        "price": addon2_raw.get("price") if addon2_raw.get("price") is not None else DEFAULT_ADDON_2["price"],
        "price_prefix": addon2_raw.get("pricePrefix") if addon2_raw.get("pricePrefix") is not None else (addon2_raw.get("price_prefix") if addon2_raw.get("price_prefix") is not None else DEFAULT_ADDON_2.get("price_prefix", "")),
        "image_url": _resolve_addon_image(addon2_raw, DEFAULT_PRESSURE_WASHER_IMAGE),
    }
    
    # 7. Pricing
    pricing_raw = proposal_data.get("pricing") or {}
    std_prices = pricing_raw.get("standardPrices") or pricing_raw.get("standard_prices") or DEFAULT_PRICING["standard_prices"]
    std_a = std_prices[0] if isinstance(std_prices, (list, tuple)) and len(std_prices) > 0 else 31500
    std_b = std_prices[1] if isinstance(std_prices, (list, tuple)) and len(std_prices) > 1 else 37200
    
    pricing = {
        "lock_in_days": pricing_raw.get("lockInDays") or pricing_raw.get("lock_in_days") or DEFAULT_PRICING["lock_in_days"],
        "standard_price_a": pricing_raw.get("standard_price_a") or std_a,
        "standard_price_b": pricing_raw.get("standard_price_b") or std_b,
        "important_note": pricing_raw.get("importantNote") or pricing_raw.get("important_note") or DEFAULT_PRICING["important_note"],
        "valid_days": pricing_raw.get("validDays") or pricing_raw.get("valid_days") or 30,
    }
    
    proposal_dict = {
        "company_name": company_name,
        "company_address": raw_comp_addr,
        "company_address_1": comp_addr1,
        "company_address_2": comp_addr2,
        "company_phone": company_phone,
        "company_email": company_email,
        "company_website": company_website,
        "logo_data_uri": logo_data_uri,
        "proposal_date": proposal_date,
        "client_property": raw_client_addr,
        "client_property_1": client_addr1,
        "client_property_2": client_addr2,
        "client_phone": client_phone,
        "client_email": client_email,
        "hero_photo_url": hero_photo_url,
        "hero_photo_x": round(float(photo1_x or 0), 2),
        "hero_photo_y": round(float(photo1_y or 0), 2),
        "hero_photo_zoom": round(float(photo1_zoom or 1.0), 2),
        "page2_photo_url": page2_photo_url,
        "page2_photo_x": round(float(photo2_x or 0), 2),
        "page2_photo_y": round(float(photo2_y or 0), 2),
        "page2_photo_zoom": round(float(photo2_zoom or 1.0), 2),
        "plan_a": plan_a,
        "plan_b": plan_b,
        "addon_1": addon_1,
        "addon_2": addon_2,
        "pricing": pricing,
    }
    
    return {"proposal": proposal_dict}

async def render_two_options_html(proposal_data: dict, settings: dict, for_preview: bool = False, preview_page: int = None) -> str:
    ctx = build_two_options_context(proposal_data, settings)
    ctx["preview_page"] = preview_page if for_preview else None
    template = jinja_env.get_template("two_options_estimate.html")
    html = template.render(**ctx)
    return html

import sys
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from playwright.sync_api import sync_playwright

logger = get_logger(__name__)

_PDF_SEMAPHORE: Optional[asyncio.Semaphore] = None
_PDF_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf_worker")

def _get_pdf_semaphore() -> asyncio.Semaphore:
    global _PDF_SEMAPHORE
    if _PDF_SEMAPHORE is None:
        _PDF_SEMAPHORE = asyncio.Semaphore(2)
    return _PDF_SEMAPHORE

def _sync_generate_pdf_worker(html_content: str) -> bytes:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        )
        page = browser.new_page()
        page.set_viewport_size({"width": 816, "height": 1056})
        page.set_content(html_content, wait_until="networkidle", timeout=30000)
        try:
            page.wait_for_function("document.fonts.ready.then(() => true)", timeout=10000)
        except Exception:
            pass
        import time
        start = time.time()
        pdf_bytes = page.pdf(
            format="Letter",
            print_background=True,
            margin={"top": "0mm", "right": "0mm", "bottom": "0mm", "left": "0mm"},
            prefer_css_page_size=True,
        )
        logger.error(f"Rendered in {time.time() - start:.2f}s")
        browser.close()
        return pdf_bytes

async def generate_estimate_proposal_pdf(proposal_data: Dict[str, Any], template_key: str = "multi_option_proposal") -> bytes:
    """
    Renders high-fidelity Letter PDF using Playwright headless Chromium
    executed in a worker thread for 100% Windows event-loop compatibility.
    """
    html_content = await render_proposal_html(proposal_data, template_key=template_key)
    sem = _get_pdf_semaphore()
    async with sem:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _PDF_EXECUTOR,
            lambda: _sync_generate_pdf_worker(html_content)
        )

def save_estimate_pdf_file(estimate_identifier: str, pdf_bytes: bytes) -> str:
    """
    Saves PDF bytes to static uploads directory and returns the public relative URL.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_id = str(estimate_identifier).replace("/", "_").replace("\\", "_").replace(" ", "_")
    filename = f"Proposal_{clean_id}_{timestamp}_{secrets.token_urlsafe(16)}.pdf"
    file_path = os.path.join(STATIC_UPLOADS_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)
        
    return f"/static/uploads/estimates/{filename}"


# ── Invoice PDF Generation ─────────────────────────────────────────────

INVOICE_TEMPLATES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "templates", "invoices"))
INVOICE_UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads", "invoices")
os.makedirs(INVOICE_UPLOADS_DIR, exist_ok=True)

invoice_jinja_env = Environment(loader=FileSystemLoader(INVOICE_TEMPLATES_DIR), autoescape=True)
invoice_jinja_env.filters['format_price'] = _format_price

def get_invoice_logo_data_uri() -> str:
    REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    candidates = [
        os.path.join(REPO_ROOT, 'crm', 'public', 'logo.svg'),
        os.path.join(REPO_ROOT, 'branding2.0', 'logo_logo_for_estimates.svg'),
        os.path.join(REPO_ROOT, 'branding2.0', 'logo_logo_for_light_bg.svg'),
        os.path.join(STATIC_DIR, 'images', 'estimates', 'riseup_arch_logo.svg'),
        os.path.join(REPO_ROOT, 'branding2.0', 'logo.svg'),
    ]
    for p in candidates:
        if os.path.exists(p):
            with open(p, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"data:image/svg+xml;base64,{b64}"
    return ""

async def render_invoice_html(invoice_data: Dict[str, Any], client_data: Optional[Dict[str, Any]] = None) -> str:
    template = invoice_jinja_env.get_template("invoice_template.html")
    logo_data_uri = get_invoice_logo_data_uri()
    client = client_data or invoice_data.get("client") or {}
    return template.render(
        invoice=invoice_data,
        client=client,
        logo_data_uri=logo_data_uri,
    )

async def generate_invoice_pdf(invoice_data: Dict[str, Any], client_data: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Renders high-fidelity Letter PDF for an invoice using Playwright headless Chromium.
    """
    html_content = await render_invoice_html(invoice_data, client_data)
    sem = _get_pdf_semaphore()
    async with sem:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _PDF_EXECUTOR,
            lambda: _sync_generate_pdf_worker(html_content)
        )

def save_invoice_pdf_file(invoice_number: str, pdf_bytes: bytes) -> str:
    """
    Saves Invoice PDF bytes to static uploads directory and returns public relative URL.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_id = str(invoice_number).replace("/", "_").replace("\\", "_").replace(" ", "_")
    filename = f"Invoice_{clean_id}_{timestamp}_{secrets.token_urlsafe(12)}.pdf"
    file_path = os.path.join(INVOICE_UPLOADS_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)
    return f"/static/uploads/invoices/{filename}"
