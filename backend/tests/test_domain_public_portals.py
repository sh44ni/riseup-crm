"""
Characterisation tests for Public Portals and Endpoints.
Tests contact form, public estimate, financing plans, reviews, and tracking.
"""
import pytest
from sqlalchemy import text


@pytest.mark.asyncio
async def test_public_contact_form_submission(client):
    """POST /api/contact processes public lead intake form."""
    payload = {
        "fullName": "Public Homeowner",
        "email": "homeowner_public@test.local",
        "phone": "760-555-0911",
        "address": "900 Public Way",
        "city": "Oceanside",
        "serviceType": "Tile Roof Repair",
        "turnstileToken": "dummy_turnstile_token",
    }

    res = await client.post("/api/contact", json=payload)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("ok") is True or "lead_id" in data or "id" in data or "success" in data


@pytest.mark.asyncio
async def test_public_financing_plans(client):
    """GET /api/financing/config returns financing rate tiers and settings."""
    res = await client.get("/api/financing/config")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, (list, dict))


@pytest.mark.asyncio
async def test_public_reviews(client):
    """GET /api/reviews/public returns public customer testimonials."""
    res = await client.get("/api/reviews/public")
    assert res.status_code == 200
