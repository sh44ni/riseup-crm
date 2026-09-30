import re
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

def normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits if len(digits) == 10 else (digits if digits else None)

def format_phone(phone: Optional[str]) -> str:
    norm = normalize_phone(phone)
    if norm and len(norm) == 10:
        return f"({norm[0:3]}) {norm[3:6]}-{norm[6:10]}"
    return phone or ""

# Well-known cities in San Diego County & Southern California service area
KNOWN_SERVICE_CITIES = {
    "oceanside", "carlsbad", "encinitas", "vista", "san marcos", "escondido",
    "fallbrook", "valley center", "poway", "solana beach", "del mar", "san diego",
    "la jolla", "rancho santa fe", "ramona", "el cajon", "santee", "chula vista",
    "national city", "coronado", "la mesa", "spring valley", "lemon grove",
    "san clemente", "temecula", "murrieta"
}

def parse_address_components(
    raw_address: Optional[str],
    raw_city: Optional[str] = None,
    raw_zip: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Parses and normalizes street address, city, and ZIP code components.
    - Preserves ZIP formatting (e.g. '92054' or '92054-1234').
    - Extracts ZIP if embedded in the address string.
    - Strips state (e.g. ', CA' or 'CA').
    - If only city/area was entered into address (e.g. 'Carlsbad' or 'Oceanside'), moves it to city.
    - Normalizes empty/whitespace strings to None.
    """
    addr = (raw_address or "").strip()
    city = (raw_city or "").strip() or None
    zip_code = (raw_zip or "").strip() or None

    # 1. Normalize/extract ZIP code (supports 5-digit and 9-digit ZIP+4)
    if zip_code:
        zip_match = re.search(r"\b(\d{5}(?:-\d{4})?)\b", zip_code)
        zip_code = zip_match.group(1) if zip_match else zip_code
    elif addr:
        zip_match = re.search(r"\b(\d{5}(?:-\d{4})?)\b", addr)
        if zip_match:
            zip_code = zip_match.group(1)
            # Remove ZIP from addr
            addr = re.sub(r"\b\d{5}(?:-\d{4})?\b", "", addr).strip()

    # 2. Strip trailing/leading punctuation or CA state abbreviation from addr
    if addr:
        # Remove state (e.g., ', CA' or ', California' or ' CA ')
        addr = re.sub(r",?\s*\b(?:CA|California)\b\.?", "", addr, flags=re.IGNORECASE).strip()
        addr = addr.rstrip(",").strip()

    # 3. Check if addr is actually just a city name or area (e.g., 'Carlsbad' or 'Oceanside')
    if addr and not city:
        clean_lower = addr.lower()
        if clean_lower in KNOWN_SERVICE_CITIES:
            # Entire input was just a city
            city = addr.title()
            addr = ""
        elif "," in addr:
            # E.g. "1234 Coast Hwy, Oceanside"
            parts = [p.strip() for p in addr.split(",") if p.strip()]
            if len(parts) >= 2:
                possible_city = parts[-1]
                if not re.search(r"\d", possible_city):
                    city = possible_city
                    addr = ", ".join(parts[:-1]).strip()

    # If city is in addr and city was also passed or extracted, remove city from addr
    if addr and city and addr.lower().endswith(city.lower()):
        addr = addr[:-len(city)].rstrip(",").strip()

    # Final normalization: empty strings become None
    final_addr = addr.strip() if addr and addr.strip() else None
    final_city = city.strip() if city and city.strip() else None
    final_zip = zip_code.strip() if zip_code and zip_code.strip() else None

    return {
        "address": final_addr,
        "city": final_city,
        "zip": final_zip
    }

async def find_or_create_client(db: AsyncSession, data: Optional[Dict[str, Any]] = None, **kwargs) -> int:
    """
    Finds existing client by phone_normalized, email, or name+address,
    or creates a new client. Returns client.id.
    """
    input_data = dict(data or {})
    input_data.update(kwargs)
    data = input_data

    full_name = (data.get("fullName") or data.get("full_name") or "").strip()
    raw_phone = data.get("phone")
    norm_phone = normalize_phone(raw_phone)
    email = (data.get("email") or "").strip().lower() or None

    parsed_addr = parse_address_components(
        data.get("address"),
        data.get("city"),
        data.get("zip") or data.get("zipCode")
    )
    address = parsed_addr["address"]
    city = parsed_addr["city"]
    zip_code = parsed_addr["zip"]

    # 1. Try matching by phone or email
    existing_id = None
    if norm_phone or email:
        conditions = []
        params = {}
        if norm_phone:
            conditions.append("phone_normalized = :norm_phone")
            params["norm_phone"] = norm_phone
        if email:
            conditions.append("LOWER(email) = :email")
            params["email"] = email

        sql = f"SELECT id FROM clients WHERE {' OR '.join(conditions)} ORDER BY created_at ASC LIMIT 1"
        res = await db.execute(text(sql), params)
        row = res.first()
        if row:
            existing_id = row[0]

    # 2. Fallback: match by name and address
    if not existing_id and full_name and address:
        sql = "SELECT id FROM clients WHERE LOWER(full_name) = LOWER(:name) AND LOWER(COALESCE(address, '')) = LOWER(:addr) ORDER BY created_at ASC LIMIT 1"
        res = await db.execute(text(sql), {"name": full_name, "addr": address})
        row = res.first()
        if row:
            existing_id = row[0]

    # If existing client found, update any blank details without overwriting valid data
    if existing_id:
        update_clauses = []
        u_params = {"id": existing_id}

        if full_name and full_name.strip() and full_name.lower() not in ("homeowner", "", "unknown", "new lead"):
            update_clauses.append("""
                full_name = CASE
                    WHEN full_name IS NULL OR TRIM(full_name) = '' OR LOWER(full_name) IN ('homeowner', 'new lead', 'unknown', 'customer')
                    THEN :full_name
                    ELSE full_name
                END
            """)
            u_params["full_name"] = full_name.strip()
        if address:
            update_clauses.append("address = COALESCE(NULLIF(address, ''), :address)")
            u_params["address"] = address
        if city:
            update_clauses.append("city = COALESCE(NULLIF(city, ''), :city)")
            u_params["city"] = city
        if zip_code:
            update_clauses.append("zip = COALESCE(NULLIF(zip, ''), :zip)")
            u_params["zip"] = zip_code
        if raw_phone and norm_phone:
            update_clauses.append("phone = COALESCE(NULLIF(phone, ''), :phone)")
            update_clauses.append("phone_normalized = COALESCE(NULLIF(phone_normalized, ''), :norm_phone)")
            u_params["phone"] = raw_phone
            u_params["norm_phone"] = norm_phone
        if email:
            update_clauses.append("email = COALESCE(NULLIF(email, ''), :email)")
            u_params["email"] = email
        if data.get("roofType") or data.get("roof_type"):
            update_clauses.append("roof_type = COALESCE(NULLIF(roof_type, ''), :roof_type)")
            u_params["roof_type"] = data.get("roofType") or data.get("roof_type")
        if data.get("roofSqf") or data.get("roof_sqf"):
            update_clauses.append("roof_sqf = COALESCE(roof_sqf, :roof_sqf)")
            u_params["roof_sqf"] = int(data.get("roofSqf") or data.get("roof_sqf"))

        if update_clauses:
            update_sql = f"UPDATE clients SET {', '.join(update_clauses)}, updated_at = NOW() WHERE id = :id"
            await db.execute(text(update_sql), u_params)

        return existing_id

    # Otherwise insert new client record
    source_type = "team_member" if data.get("sourceType") == "team_member" or data.get("acquiredByUserId") else "website"
    source_detail = data.get("leadSourceDetail") or data.get("leadSource") or ("Team Member Attribution" if source_type == "team_member" else "Website Inbound")

    insert_params = {
        "full_name": full_name or "Homeowner",
        "phone": raw_phone,
        "phone_normalized": norm_phone,
        "email": email,
        "address": address,
        "city": city,
        "zip": zip_code,
        "property_type": data.get("propertyType") or "Single Family",
        "roof_type": data.get("roofType"),
        "roof_sqf": int(data.get("roofSqf")) if data.get("roofSqf") is not None else None,
        "stories": int(data.get("stories") or 1),
        "hoa": bool(data.get("hoa")),
        "notes": data.get("notes"),
        "source_type": source_type,
        "source_detail": source_detail,
    }

    # Atomic PostgreSQL UPSERT if email is provided
    if email:
        upsert_sql = text("""
            INSERT INTO clients (
                full_name, phone, phone_normalized, email, address, city, zip,
                property_type, roof_type, roof_sqf, stories, hoa, status,
                client_category, tags, notes, source_type, lead_source_detail, client_since
            ) VALUES (
                :full_name, :phone, :phone_normalized, :email, :address, :city, :zip,
                :property_type, :roof_type, :roof_sqf, :stories, :hoa, 'lead',
                'lead', '{"New Lead"}', :notes, :source_type, :source_detail, NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
                phone = COALESCE(NULLIF(clients.phone, ''), EXCLUDED.phone),
                phone_normalized = COALESCE(NULLIF(clients.phone_normalized, ''), EXCLUDED.phone_normalized),
                address = COALESCE(NULLIF(clients.address, ''), EXCLUDED.address),
                city = COALESCE(NULLIF(clients.city, ''), EXCLUDED.city),
                zip = COALESCE(NULLIF(clients.zip, ''), EXCLUDED.zip),
                updated_at = NOW()
            RETURNING id
        """)
        try:
            async with db.begin_nested():
                res = await db.execute(upsert_sql, insert_params)
                return res.scalar_one()
        except IntegrityError:
            pass  # Fall through to re-select below
        except Exception:
            # Fall back to standard insert if unique constraint not yet applied
            pass

    # Standard insert with graceful IntegrityError handling for race conditions
    insert_sql = text("""
        INSERT INTO clients (
            full_name, phone, phone_normalized, email, address, city, zip,
            property_type, roof_type, roof_sqf, stories, hoa, status,
            client_category, tags, notes, source_type, lead_source_detail, client_since
        ) VALUES (
            :full_name, :phone, :phone_normalized, :email, :address, :city, :zip,
            :property_type, :roof_type, :roof_sqf, :stories, :hoa, 'lead',
            'lead', '{"New Lead"}', :notes, :source_type, :source_detail, NOW()
        ) RETURNING id
    """)

    try:
        async with db.begin_nested():
            res = await db.execute(insert_sql, insert_params)
            return res.scalar_one()
    except IntegrityError:
        # Concurrent insert occurred in another transaction; re-select existing client
        reselect_sql = text("""
            SELECT id FROM clients
            WHERE (email IS NOT NULL AND LOWER(email) = LOWER(:email))
               OR (phone_normalized IS NOT NULL AND phone_normalized = :norm_phone)
            ORDER BY created_at ASC LIMIT 1
        """)
        res = await db.execute(reselect_sql, {"email": email, "norm_phone": norm_phone})
        row = res.first()
        if row:
            return row[0]
        if full_name and address:
            res = await db.execute(
                text("SELECT id FROM clients WHERE LOWER(full_name) = LOWER(:name) AND LOWER(COALESCE(address, '')) = LOWER(:addr) ORDER BY created_at ASC LIMIT 1"),
                {"name": full_name, "addr": address}
            )
            row = res.first()
            if row:
                return row[0]
        raise


async def recalculate_client_stats(db: AsyncSession, client_id: int) -> None:
    """
    Computes lifetime revenue, job counts, active state, and 4-tier category.
    """
    # 1. Total revenue from paid invoices or completed jobs
    rev_sql = text("""
        SELECT COALESCE(SUM(amount), 0) as total
        FROM invoices
        WHERE (
            job_id IN (SELECT id FROM jobs WHERE client_id = :cid OR lead_id IN (SELECT id FROM leads WHERE client_id = :cid))
            OR estimate_id IN (SELECT id FROM estimates WHERE client_id = :cid)
            OR client_id = :cid
        ) AND status = 'paid'
    """)
    total_rev = float((await db.execute(rev_sql, {"cid": client_id})).scalar_one() or 0)

    if total_rev == 0:
        job_val_sql = text("""
            SELECT COALESCE(SUM(contract_value), 0) as total
            FROM jobs
            WHERE (client_id = :cid OR lead_id IN (SELECT id FROM leads WHERE client_id = :cid))
              AND status = 'complete'
        """)
        total_rev = float((await db.execute(job_val_sql, {"cid": client_id})).scalar_one() or 0)

    # 2. Count jobs
    job_res = (await db.execute(text("""
        SELECT 
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN status NOT IN ('complete', 'cancelled') THEN 1 END) as active_jobs
        FROM jobs
        WHERE client_id = :cid OR lead_id IN (SELECT id FROM leads WHERE client_id = :cid)
    """), {"cid": client_id})).mappings().first()

    total_jobs = int(job_res["total_jobs"] or 0)
    has_active_job = int(job_res["active_jobs"] or 0) > 0

    # 3. Check for signed contract or won lead
    lead_res = (await db.execute(text("""
        SELECT 
            COUNT(CASE WHEN status = 'won' OR contract_signed_at IS NOT NULL OR pipeline_stage = 'stage_5_completion_followup' THEN 1 END) as won_leads,
            COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
            COUNT(CASE WHEN site_visit_scheduled_at IS NOT NULL OR status IN ('estimate_scheduled', 'inspected') OR pipeline_stage IN ('stage_2_site_visit', 'stage_3_estimate_drafting') THEN 1 END) as inspections_count,
            COUNT(CASE WHEN proposal_sent_at IS NOT NULL OR status IN ('estimate_sent', 'quoted') OR pipeline_stage = 'stage_4_proposal_review' THEN 1 END) as proposals_count
        FROM leads WHERE client_id = :cid
    """), {"cid": client_id})).mappings().first()

    has_won = int(lead_res["won_leads"] or 0) > 0
    has_lost = int(lead_res["lost_leads"] or 0) > 0
    has_engagement = (int(lead_res["inspections_count"] or 0) > 0) or (int(lead_res["proposals_count"] or 0) > 0)

    # 4. Resolve 4-tier category
    is_existing = has_active_job or total_jobs > 0 or total_rev > 0 or has_won

    if is_existing:
        category = "existing_client"
        status_val = "active_job" if has_active_job else ("repeat" if total_jobs > 1 else "completed")
    elif has_lost:
        category = "lost_lead"
        status_val = "lost"
    elif has_engagement:
        category = "new_client"
        status_val = "opportunity"
    else:
        category = "lead"
        status_val = "lead"

    await db.execute(text("""
        UPDATE clients
        SET total_revenue = :rev,
            total_jobs_count = :cnt,
            status = :status,
            client_category = :cat,
            updated_at = NOW()
        WHERE id = :cid
    """), {
        "rev": total_rev,
        "cnt": total_jobs,
        "status": status_val,
        "cat": category,
        "cid": client_id
    })

async def bulk_recalculate_all_client_stats(db: AsyncSession) -> int:
    """
    Computes lifetime revenue, job counts, active state, and 4-tier category
    for ALL clients in a single high-performance bulk update query.
    Replaces serial O(N) client iteration with an optimized single bulk statement.
    """
    bulk_sql = text("""
        WITH client_rev AS (
            SELECT 
                c.id as client_id,
                COALESCE(
                    NULLIF(
                        (
                            SELECT COALESCE(SUM(i.amount), 0)
                            FROM invoices i
                            WHERE (
                                i.job_id IN (SELECT j.id FROM jobs j WHERE j.client_id = c.id OR j.lead_id IN (SELECT l.id FROM leads l WHERE l.client_id = c.id))
                                OR i.estimate_id IN (SELECT e.id FROM estimates e WHERE e.client_id = c.id)
                                OR i.client_id = c.id
                            ) AND i.status = 'paid'
                        ), 0
                    ),
                    (
                        SELECT COALESCE(SUM(j.contract_value), 0)
                        FROM jobs j
                        WHERE (j.client_id = c.id OR j.lead_id IN (SELECT l.id FROM leads l WHERE l.client_id = c.id))
                          AND j.status = 'complete'
                    ),
                    0
                ) as total_rev
            FROM clients c
        ),
        client_jobs AS (
            SELECT 
                c.id as client_id,
                COUNT(j.id) as total_jobs,
                COUNT(CASE WHEN j.status NOT IN ('complete', 'cancelled') THEN 1 END) as active_jobs
            FROM clients c
            LEFT JOIN jobs j ON (j.client_id = c.id OR j.lead_id IN (SELECT l.id FROM leads l WHERE l.client_id = c.id))
            GROUP BY c.id
        ),
        client_leads AS (
            SELECT 
                c.id as client_id,
                COUNT(CASE WHEN l.status = 'won' OR l.contract_signed_at IS NOT NULL OR l.pipeline_stage = 'stage_5_completion_followup' THEN 1 END) as won_leads,
                COUNT(CASE WHEN l.status = 'lost' THEN 1 END) as lost_leads,
                COUNT(CASE WHEN l.site_visit_scheduled_at IS NOT NULL OR l.status IN ('estimate_scheduled', 'inspected') OR l.pipeline_stage IN ('stage_2_site_visit', 'stage_3_estimate_drafting') THEN 1 END) as inspections_count,
                COUNT(CASE WHEN l.proposal_sent_at IS NOT NULL OR l.status IN ('estimate_sent', 'quoted') OR l.pipeline_stage = 'stage_4_proposal_review' THEN 1 END) as proposals_count
            FROM clients c
            LEFT JOIN leads l ON l.client_id = c.id
            GROUP BY c.id
        )
        UPDATE clients c
        SET 
            total_revenue = cr.total_rev,
            total_jobs_count = cj.total_jobs,
            updated_at = NOW(),
            client_category = CASE
                WHEN (cj.active_jobs > 0 OR cj.total_jobs > 0 OR cr.total_rev > 0 OR cl.won_leads > 0) THEN 'existing_client'
                WHEN cl.lost_leads > 0 THEN 'lost_lead'
                WHEN (cl.inspections_count > 0 OR cl.proposals_count > 0) THEN 'new_client'
                ELSE 'lead'
            END,
            status = CASE
                WHEN (cj.active_jobs > 0 OR cj.total_jobs > 0 OR cr.total_rev > 0 OR cl.won_leads > 0) THEN 
                    CASE WHEN cj.active_jobs > 0 THEN 'active_job' WHEN cj.total_jobs > 1 THEN 'repeat' ELSE 'completed' END
                WHEN cl.lost_leads > 0 THEN 'lost'
                WHEN (cl.inspections_count > 0 OR cl.proposals_count > 0) THEN 'opportunity'
                ELSE 'lead'
            END
        FROM client_rev cr, client_jobs cj, client_leads cl
        WHERE c.id = cr.client_id AND c.id = cj.client_id AND c.id = cl.client_id
    """)
    res = await db.execute(bulk_sql)
    return res.rowcount or 0

async def auto_heal_dataflow_sync(db: AsyncSession) -> Dict[str, Any]:
    """
    Automated system integrity scan and repair routine.
    """
    # 1. Link unlinked leads
    unlinked_leads = (await db.execute(text("""
        SELECT id, full_name, phone, email, address, city, zip, service_type, notes
        FROM leads WHERE client_id IS NULL AND (phone IS NOT NULL OR email IS NOT NULL)
    """))).mappings().all()

    leads_healed = 0
    for l in unlinked_leads:
        cid = await find_or_create_client(db, dict(l))
        await db.execute(text("UPDATE leads SET client_id = :cid WHERE id = :lid"), {"cid": cid, "lid": l["id"]})
        leads_healed += 1

    # 2. Link jobs client_id via lead_id
    await db.execute(text("""
        UPDATE jobs j
        SET client_id = l.client_id
        FROM leads l
        WHERE j.lead_id = l.id AND j.client_id IS NULL AND l.client_id IS NOT NULL
    """))

    # 3. Link estimates client_id
    await db.execute(text("""
        UPDATE estimates e
        SET client_id = COALESCE(
            (SELECT client_id FROM leads l WHERE l.id = e.lead_id),
            (SELECT client_id FROM jobs j WHERE j.estimate_id = e.id)
        )
        WHERE e.client_id IS NULL
    """))

    # 4. Link invoices client_id
    await db.execute(text("""
        UPDATE invoices i
        SET client_id = (SELECT client_id FROM jobs j WHERE j.id = i.job_id)
        WHERE i.client_id IS NULL AND i.job_id IS NOT NULL
    """))

    # 5. Link warranties client_id
    await db.execute(text("""
        UPDATE warranties w
        SET client_id = COALESCE(
            (SELECT client_id FROM jobs j WHERE j.id = w.job_id),
            (SELECT client_id FROM leads l WHERE l.id = w.lead_id)
        )
        WHERE w.client_id IS NULL
    """))

    # 6. Align pipeline stage 5 for completed jobs
    await db.execute(text("""
        UPDATE leads l
        SET pipeline_stage = 'stage_5_completion_followup',
            status = 'won',
            job_completed_at = COALESCE(l.job_completed_at, j.updated_at, NOW())
        FROM jobs j
        WHERE j.lead_id = l.id AND j.status = 'complete' AND (l.pipeline_stage != 'stage_5_completion_followup' OR l.status != 'won')
    """))

    # 7. Recalculate stats for all clients in single bulk query
    updated_clients = await bulk_recalculate_all_client_stats(db)

    return {
        "leads_healed": leads_healed,
        "clients_recalculated": updated_clients,
        "status": "healthy"
    }
