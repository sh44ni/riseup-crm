"""
Characterisation tests for Jobs & Finances domains.
Tests jobs listing, creation, updates, and finances overview/invoices.
"""
import pytest
from sqlalchemy import text
from tests.factories import make_lead, make_client, make_job


@pytest.mark.asyncio
async def test_jobs_list_happy_path(client, auth_owner, db):
    """GET /api/admin/jobs returns jobs list."""
    job = await make_job(db, status="in_progress")

    res = await client.get("/api/admin/jobs", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "jobs" in data or isinstance(data, list)


@pytest.mark.asyncio
async def test_jobs_create_happy_path(client, auth_owner, db):
    """POST /api/admin/jobs creates a production job."""
    lead = await make_lead(db, full_name="Job Customer", phone="760-555-0722")

    payload = {
        "title": "Complete Tile Roof Installation",
        "lead_id": lead.id,
        "customer_name": "Job Customer",
        "customer_phone": "760-555-0722",
        "address": "456 Construction Rd",
        "city": "Carlsbad",
        "zip": "92008",
        "service_type": "Tile Roofing",
        "contract_value": 28000.0,
        "status": "in_progress",
    }

    res = await client.post("/api/admin/jobs", json=payload, headers=auth_owner)
    assert res.status_code in (200, 201)
    data = res.json()
    job_id = data.get("id") or data.get("job", {}).get("id")
    assert job_id is not None


@pytest.mark.asyncio
async def test_finances_overview_happy_path(client, auth_owner):
    """GET /api/admin/finances returns financial analytics."""
    res = await client.get("/api/admin/finances", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data or "summary" in data or "ok" in data or "stats" in data
