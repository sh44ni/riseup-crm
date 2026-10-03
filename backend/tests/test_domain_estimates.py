"""
Characterisation tests for Estimates domain.
Tests create, list, detail, calculate, two-options, render-html, send, and concurrency numbering race.
"""
import pytest
import asyncio
from datetime import datetime, timezone
from sqlalchemy import text
from tests.factories import make_lead, make_client, make_estimate


@pytest.mark.asyncio
async def test_estimates_list_happy_path(client, auth_owner, db):
    """GET /api/admin/estimates returns estimate list and summary."""
    lead = await make_lead(db, contact_name="Estimate Lead")
    est = await make_estimate(db, lead_id=lead.id, customer_name="Estimate Lead", total=12500.0)

    res = await client.get("/api/admin/estimates", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "estimates" in data
    assert "summary" in data
    assert any(e["id"] == est.id for e in data["estimates"])


@pytest.mark.asyncio
async def test_estimates_create_happy_path(client, auth_owner, db):
    """POST /api/admin/estimates creates estimate and calculates pricing."""
    lead = await make_lead(db, contact_name="New Homeowner", email="home@example.com")

    payload = {
        "customer_name": "New Homeowner",
        "customer_email": "home@example.com",
        "customer_phone": "555-0199",
        "customer_address": "456 Oak Avenue",
        "lead_id": lead.id,
        "roof_squares": 28.0,
        "roof_pitch": "6:12",
        "stories": 2,
        "tearoff_layers": 1,
        "material_id": "oc_duration",
        "margin_pct": 32.0,
    }

    res = await client.post("/api/admin/estimates", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    est = data["estimate"]
    assert est["customer_name"] == "New Homeowner"
    assert est["estimate_number"].startswith("EST-")
    assert est["total"] > 0
    assert est["status"] == "draft"

    # Verify persisted in database
    db_res = await db.execute(text("SELECT id, estimate_number, total FROM estimates WHERE id = :id"), {"id": est["id"]})
    row = db_res.first()
    assert row is not None
    assert row.estimate_number == est["estimate_number"]


@pytest.mark.asyncio
async def test_estimates_create_validation_error(client, auth_owner):
    """POST /api/admin/estimates returns 400 or 422 if required fields are missing."""
    # Missing customer_name
    res = await client.post("/api/admin/estimates", json={"roof_squares": 25.0}, headers=auth_owner)
    assert res.status_code in (400, 422)


@pytest.mark.asyncio
async def test_estimates_get_detail_and_not_found(client, auth_owner, db):
    """GET /api/admin/estimates/{id} returns 200 for existing, 404 for missing."""
    est = await make_estimate(db, customer_name="Detail Customer", total=8900.0)

    res = await client.get(f"/api/admin/estimates/{est.id}", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "estimate" in data
    assert data["estimate"]["id"] == est.id
    assert data["estimate"]["customer_name"] == "Detail Customer"

    missing_res = await client.get("/api/admin/estimates/999999", headers=auth_owner)
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_estimates_calculate_pricing(client, auth_owner):
    """POST /api/admin/estimates/calculate calculates price breakdown."""
    payload = {
        "roof_squares": 30.0,
        "pitch": "5:12",
        "stories": 1,
        "tearoff_layers": 1,
        "material_id": "oc_duration",
        "margin_pct": 30.0,
        "financing_months": 60,
    }

    res = await client.post("/api/admin/estimates/calculate", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data.get("ok") is True
    assert "costBreakdown" in data
    assert "marginTiers" in data


@pytest.mark.asyncio
async def test_estimates_two_options_create(client, auth_owner, db):
    """POST /api/admin/estimates/two-options creates a multi-option proposal."""
    lead = await make_lead(db, contact_name="Two Option Lead")

    payload = {
        "client": {
            "name": "Two Option Lead",
            "email": "twooption@example.com",
            "phone": "555-0233",
            "property": "789 Pine Road",
            "leadId": str(lead.id),
        },
        "pricing": {
            "total": 14500.0,
        },
        "plans": [
            {"name": "Standard Architectural", "total": 12500.0},
            {"name": "Premium Impact Resistant", "total": 16500.0},
        ],
    }

    res = await client.post("/api/admin/estimates/two-options", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data.get("ok") is True
    assert "estimate" in data
    assert data["estimate"]["customer_name"] == "Two Option Lead"


@pytest.mark.asyncio
async def test_estimates_render_html(client, auth_owner, db):
    """GET /api/admin/estimates/{id}/render-html returns HTML preview."""
    est = await make_estimate(
        db,
        customer_name="HTML Preview Lead",
        proposal_data={"client": {"name": "HTML Preview Lead"}},
    )

    res = await client.get(f"/api/admin/estimates/{est.id}/render-html", headers=auth_owner)
    assert res.status_code == 200
    assert "text/html" in res.headers.get("content-type", "")
    assert len(res.text) > 0


@pytest.mark.asyncio
async def test_estimates_send_estimate(client, auth_owner, db):
    """POST /api/admin/estimates/{id}/send-estimate dispatches email."""
    est = await make_estimate(
        db,
        customer_name="Send Estimate Lead",
        customer_email="sendtest@example.com",
    )

    payload = {
        "customerEmail": "sendtest@example.com",
        "customerName": "Send Estimate Lead",
    }

    res = await client.post(f"/api/admin/estimates/{est.id}/send-estimate", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data.get("ok") is True or "sent" in data


@pytest.mark.asyncio
async def test_concurrent_estimate_creation_numbering(client, auth_owner):
    """
    Simultaneous estimate creations generate conflicting estimate numbers
    because seq is computed via non-atomic SELECT COUNT(*) FROM estimates.
    Desired: Both succeed with distinct numbers (e.g. EST-2026-0001 and EST-2026-0002).
    Today: One of them crashes with unique constraint violation (500).
    """
    payload_1 = {"customer_name": "Concurrent One", "roof_squares": 20.0}
    payload_2 = {"customer_name": "Concurrent Two", "roof_squares": 25.0}

    req_1 = client.post("/api/admin/estimates", json=payload_1, headers=auth_owner)
    req_2 = client.post("/api/admin/estimates", json=payload_2, headers=auth_owner)

    res_1, res_2 = await asyncio.gather(req_1, req_2)

    # In safe atomic numbering, both should be 200 with unique numbers
    assert res_1.status_code == 200
    assert res_2.status_code == 200
    assert res_1.json()["estimate_number"] != res_2.json()["estimate_number"]
