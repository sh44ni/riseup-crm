"""
Database Backfill Script for Consistent Name and Address Formatting.

Iterates over all existing records across:
- clients (full_name, address, city, zip)
- leads (full_name, address, city, zip)
- estimates (customer_name, customer_address, customer_city, customer_zip, proposal_data)
- contracts (contract_data: client_name, project_address)
- jobs (customer_name, address, city, zip)

Standardizes casing, suffixes, prefixes, abbreviations, directionals, unit numbers, and collapses whitespace.
Preserves legitimate names and formatting.
"""

import asyncio
import json
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.database import get_database_url
from app.utils.formatting import (
    format_person_name,
    format_street_address,
    format_city_name,
    format_zip_code,
)
from app.services.sync import parse_address_components
from app.services.contract_pdf_generator import _clean_address_string


async def backfill_database(db_url: str = None) -> None:
    target_url = db_url or get_database_url()
    print(f"[*] Connecting to database: {target_url.split('@')[-1] if '@' in target_url else target_url}")

    engine = create_async_engine(target_url, echo=False)

    async with engine.begin() as conn:
        print("\n--- 1. Backfilling clients table ---")
        client_res = await conn.execute(text("SELECT id, full_name, address, city, zip FROM clients ORDER BY id"))
        clients = client_res.mappings().all()
        clients_updated = 0

        for c in clients:
            cid = c["id"]
            orig_name = c["full_name"] or ""
            orig_addr = c["address"] or ""
            orig_city = c["city"] or ""
            orig_zip = c["zip"] or ""

            new_name = format_person_name(orig_name)
            parsed_addr = parse_address_components(orig_addr, orig_city, orig_zip)
            new_addr = parsed_addr["address"]
            new_city = parsed_addr["city"]
            new_zip = parsed_addr["zip"]

            # Check if any field changed
            changed = (
                (new_name != orig_name) or
                (new_addr != (orig_addr if orig_addr else None)) or
                (new_city != (orig_city if orig_city else None)) or
                (new_zip != (orig_zip if orig_zip else None))
            )

            if changed:
                print(f"  [Client #{cid}]")
                if new_name != orig_name:
                    print(f"    Name:    '{orig_name}' -> '{new_name}'")
                if new_addr != (orig_addr if orig_addr else None):
                    print(f"    Address: '{orig_addr}' -> '{new_addr}'")
                if new_city != (orig_city if orig_city else None):
                    print(f"    City:    '{orig_city}' -> '{new_city}'")
                if new_zip != (orig_zip if orig_zip else None):
                    print(f"    Zip:     '{orig_zip}' -> '{new_zip}'")

                await conn.execute(
                    text("""
                        UPDATE clients
                        SET full_name = :name,
                            address = :addr,
                            city = :city,
                            zip = :zip,
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {"name": new_name, "addr": new_addr, "city": new_city, "zip": new_zip, "id": cid}
                )
                clients_updated += 1

        print(f"[*] Clients backfill complete: {clients_updated}/{len(clients)} records updated.")

        print("\n--- 2. Backfilling leads table ---")
        lead_res = await conn.execute(text("SELECT id, full_name, address, city, zip FROM leads ORDER BY id"))
        leads = lead_res.mappings().all()
        leads_updated = 0

        for l in leads:
            lid = l["id"]
            orig_name = l["full_name"] or ""
            orig_addr = l["address"] or ""
            orig_city = l["city"] or ""
            orig_zip = l["zip"] or ""

            new_name = format_person_name(orig_name)
            parsed_addr = parse_address_components(orig_addr, orig_city, orig_zip)
            new_addr = parsed_addr["address"]
            new_city = parsed_addr["city"]
            new_zip = parsed_addr["zip"]

            changed = (
                (new_name != orig_name) or
                (new_addr != (orig_addr if orig_addr else None)) or
                (new_city != (orig_city if orig_city else None)) or
                (new_zip != (orig_zip if orig_zip else None))
            )

            if changed:
                print(f"  [Lead #{lid}]")
                if new_name != orig_name:
                    print(f"    Name:    '{orig_name}' -> '{new_name}'")
                if new_addr != (orig_addr if orig_addr else None):
                    print(f"    Address: '{orig_addr}' -> '{new_addr}'")
                if new_city != (orig_city if orig_city else None):
                    print(f"    City:    '{orig_city}' -> '{new_city}'")
                if new_zip != (orig_zip if orig_zip else None):
                    print(f"    Zip:     '{orig_zip}' -> '{new_zip}'")

                await conn.execute(
                    text("""
                        UPDATE leads
                        SET full_name = :name,
                            address = :addr,
                            city = :city,
                            zip = :zip,
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {"name": new_name, "addr": new_addr, "city": new_city, "zip": new_zip, "id": lid}
                )
                leads_updated += 1

        print(f"[*] Leads backfill complete: {leads_updated}/{len(leads)} records updated.")

        print("\n--- 3. Backfilling estimates table ---")
        est_res = await conn.execute(
            text("SELECT id, customer_name, customer_address, customer_city, customer_zip, proposal_data FROM estimates ORDER BY id")
        )
        estimates = est_res.mappings().all()
        est_updated = 0

        for e in estimates:
            eid = e["id"]
            orig_name = e["customer_name"] or ""
            orig_addr = e["customer_address"] or ""
            orig_city = e["customer_city"] or ""
            orig_zip = e["customer_zip"] or ""
            pdata = e["proposal_data"]

            new_name = format_person_name(orig_name)
            parsed_addr = parse_address_components(orig_addr, orig_city, orig_zip)
            new_addr = parsed_addr["address"]
            new_city = parsed_addr["city"]
            new_zip = parsed_addr["zip"]

            pdata_changed = False
            if pdata and isinstance(pdata, dict):
                pdata_copy = dict(pdata)
                client_obj = pdata_copy.get("client")
                if client_obj and isinstance(client_obj, dict):
                    c_dict = dict(client_obj)
                    if c_dict.get("name"):
                        fmt_cname = format_person_name(c_dict["name"])
                        if fmt_cname != c_dict["name"]:
                            c_dict["name"] = fmt_cname
                            pdata_changed = True
                    if c_dict.get("property"):
                        fmt_prop = format_street_address(c_dict["property"])
                        if fmt_prop != c_dict["property"]:
                            c_dict["property"] = fmt_prop
                            pdata_changed = True
                    if pdata_changed:
                        pdata_copy["client"] = c_dict
                        pdata = pdata_copy

            changed = (
                (new_name != orig_name) or
                (new_addr != (orig_addr if orig_addr else None)) or
                (new_city != (orig_city if orig_city else None)) or
                (new_zip != (orig_zip if orig_zip else None)) or
                pdata_changed
            )

            if changed:
                print(f"  [Estimate #{eid}]")
                if new_name != orig_name:
                    print(f"    Name:    '{orig_name}' -> '{new_name}'")
                if new_addr != (orig_addr if orig_addr else None):
                    print(f"    Address: '{orig_addr}' -> '{new_addr}'")
                if new_city != (orig_city if orig_city else None):
                    print(f"    City:    '{orig_city}' -> '{new_city}'")
                if new_zip != (orig_zip if orig_zip else None):
                    print(f"    Zip:     '{orig_zip}' -> '{new_zip}'")

                await conn.execute(
                    text("""
                        UPDATE estimates
                        SET customer_name = :name,
                            customer_address = :addr,
                            customer_city = :city,
                            customer_zip = :zip,
                            proposal_data = CAST(:pdata AS jsonb),
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {
                        "name": new_name,
                        "addr": new_addr,
                        "city": new_city,
                        "zip": new_zip,
                        "pdata": json.dumps(pdata) if pdata else None,
                        "id": eid,
                    }
                )
                est_updated += 1

        print(f"[*] Estimates backfill complete: {est_updated}/{len(estimates)} records updated.")

        print("\n--- 4. Backfilling contracts table ---")
        contract_res = await conn.execute(text("SELECT id, contract_data FROM contracts ORDER BY id"))
        contracts = contract_res.mappings().all()
        contracts_updated = 0

        for c in contracts:
            cid = c["id"]
            cdata = c["contract_data"]
            if not cdata:
                continue

            cdata_dict = dict(cdata) if isinstance(cdata, dict) else json.loads(cdata)
            cdata_changed = False

            if cdata_dict.get("client_name"):
                fmt_name = format_person_name(cdata_dict["client_name"])
                if fmt_name != cdata_dict["client_name"]:
                    print(f"  [Contract #{cid}] client_name: '{cdata_dict['client_name']}' -> '{fmt_name}'")
                    cdata_dict["client_name"] = fmt_name
                    cdata_changed = True

            if cdata_dict.get("project_address"):
                fmt_addr = _clean_address_string(cdata_dict["project_address"])
                if fmt_addr != cdata_dict["project_address"]:
                    print(f"  [Contract #{cid}] project_address: '{cdata_dict['project_address']}' -> '{fmt_addr}'")
                    cdata_dict["project_address"] = fmt_addr
                    cdata_changed = True

            if cdata_changed:
                await conn.execute(
                    text("""
                        UPDATE contracts
                        SET contract_data = CAST(:cdata AS jsonb),
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {"cdata": json.dumps(cdata_dict), "id": cid}
                )
                contracts_updated += 1

        print(f"[*] Contracts backfill complete: {contracts_updated}/{len(contracts)} records updated.")

        print("\n--- 5. Backfilling jobs table ---")
        job_res = await conn.execute(text("SELECT id, customer_name, address, city, zip FROM jobs ORDER BY id"))
        jobs = job_res.mappings().all()
        jobs_updated = 0

        for j in jobs:
            jid = j["id"]
            orig_name = j["customer_name"] or ""
            orig_addr = j["address"] or ""
            orig_city = j["city"] or ""
            orig_zip = j["zip"] or ""

            new_name = format_person_name(orig_name)
            parsed_addr = parse_address_components(orig_addr, orig_city, orig_zip)
            new_addr = parsed_addr["address"]
            new_city = parsed_addr["city"]
            new_zip = parsed_addr["zip"]

            changed = (
                (new_name != orig_name) or
                (new_addr != (orig_addr if orig_addr else None)) or
                (new_city != (orig_city if orig_city else None)) or
                (new_zip != (orig_zip if orig_zip else None))
            )

            if changed:
                print(f"  [Job #{jid}]")
                if new_name != orig_name:
                    print(f"    Name:    '{orig_name}' -> '{new_name}'")
                if new_addr != (orig_addr if orig_addr else None):
                    print(f"    Address: '{orig_addr}' -> '{new_addr}'")
                if new_city != (orig_city if orig_city else None):
                    print(f"    City:    '{orig_city}' -> '{new_city}'")
                if new_zip != (orig_zip if orig_zip else None):
                    print(f"    Zip:     '{orig_zip}' -> '{new_zip}'")

                await conn.execute(
                    text("""
                        UPDATE jobs
                        SET customer_name = :name,
                            address = :addr,
                            city = :city,
                            zip = :zip,
                            updated_at = NOW()
                        WHERE id = :id
                    """),
                    {"name": new_name, "addr": new_addr, "city": new_city, "zip": new_zip, "id": jid}
                )
                jobs_updated += 1

        print(f"[*] Jobs backfill complete: {jobs_updated}/{len(jobs)} records updated.")

    await engine.dispose()
    print("\n[SUCCESS] Backfill completed successfully!")


if __name__ == "__main__":
    db_arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(backfill_database(db_arg))
