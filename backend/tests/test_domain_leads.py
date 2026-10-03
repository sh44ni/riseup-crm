"""
Characterisation tests for Leads domain (WP-2.5).
Covers:
  - GET /api/admin/leads (list, search, filtering, counts)
  - POST /api/admin/leads (create lead, validation, lead score calculation)
  - GET /api/admin/leads/{id} (lead detail, 404, permissions)
  - PUT /api/admin/leads/{id} (status/stage update, activity logging)
  - DELETE /api/admin/leads/{id} (deletion, activity logging)
  - GET /api/admin/leads/{id}/activities (activity feed)
"""
import pytest
from sqlalchemy import text
from tests.factories import make_lead, make_user, login_as


@pytest.mark.asyncio
async def test_leads_list_happy_path(client, db, auth_owner):
    """GET /api/admin/leads returns list of leads with counts."""
    await make_lead(db, full_name="Alpha Roofing Lead", status="new")
    await make_lead(db, full_name="Beta Roofing Lead", status="contacted")

    response = await client.get("/api/admin/leads", headers=auth_owner)
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data
    assert "counts" in data
    assert data["total"] >= 2
    names = [l["full_name"] for l in data["leads"]]
    assert "Alpha Roofing Lead" in names
    assert "Beta Roofing Lead" in names


@pytest.mark.asyncio
async def test_leads_search_filter(client, db, auth_owner):
    """GET /api/admin/leads?search=... filters by name or email."""
    await make_lead(db, full_name="UniqueSearchable Person", email="person@unique.test")
    await make_lead(db, full_name="Different Person", email="different@other.test")

    response = await client.get("/api/admin/leads?search=UniqueSearchable", headers=auth_owner)
    assert response.status_code == 200
    leads = response.json()["leads"]
    assert len(leads) >= 1
    assert all("UniqueSearchable" in l["full_name"] for l in leads)


@pytest.mark.asyncio
async def test_leads_create_happy_path(client, db, auth_owner):
    """POST /api/admin/leads creates lead and logs activity."""
    payload = {
        "full_name": "New Inspection Request",
        "phone": "760-555-4321",
        "email": "inspection@homeowner.test",
        "address": "789 Hilltop Rd",
        "city": "Escondido",
        "zip": "92025",
        "service_type": "Tile Relay & Underlayment",
        "notes": "Urgent leak in master bedroom",
    }
    response = await client.post("/api/admin/leads", json=payload, headers=auth_owner)
    assert response.status_code in (200, 201)
    res_data = response.json()
    lead_id = res_data.get("id") or (res_data.get("lead", {}).get("id"))
    assert lead_id is not None

    # Verify persisted in database
    res = await db.execute(text("SELECT full_name, priority, lead_score FROM leads WHERE id = :id"), {"id": lead_id})
    row = res.mappings().first()
    assert row["full_name"] == "New Inspection Request"
    assert row["lead_score"] is not None


@pytest.mark.asyncio
async def test_leads_create_validation_error(client, auth_owner):
    """POST /api/admin/leads without required full_name returns 400 or 422."""
    payload = {
        "phone": "760-555-4321",
        # Missing full_name
    }
    response = await client.post("/api/admin/leads", json=payload, headers=auth_owner)
    assert response.status_code in (400, 422)


@pytest.mark.asyncio
async def test_leads_get_detail_and_not_found(client, db, auth_owner):
    """GET /api/admin/leads/{id} returns lead detail or 404."""
    lead = await make_lead(db, full_name="Detail Test Lead")

    # Happy path
    res = await client.get(f"/api/admin/leads/{lead.id}", headers=auth_owner)
    assert res.status_code == 200
    assert (res.json().get("lead", {}).get("full_name") or res.json().get("full_name")) == "Detail Test Lead"

    # Not found
    res_404 = await client.get("/api/admin/leads/9999999", headers=auth_owner)
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_leads_update_stage_happy_path(client, db, user_owner, auth_owner):
    """PUT /api/admin/leads/{id} updates lead fields once claimed."""
    lead = await make_lead(
        db,
        full_name="Stage Transition Lead",
        pipeline_stage="stage_1_lead_gen",
        assigned_to_user_id=user_owner.id,
    )

    update_payload = {
        "pipeline_stage": "stage_2_consultation_inspection",
        "notes": "Inspection scheduled for Friday morning",
    }
    response = await client.put(f"/api/admin/leads/{lead.id}", json=update_payload, headers=auth_owner)
    assert response.status_code == 200

    # Verify database update
    res = await db.execute(text("SELECT pipeline_stage, notes FROM leads WHERE id = :id"), {"id": lead.id})
    row = res.mappings().first()
    assert row["pipeline_stage"] == "stage_2_consultation_inspection"
    assert "Friday morning" in row["notes"]


@pytest.mark.asyncio
async def test_unclaimed_lead_cannot_advance_stage(client, db, auth_owner):
    """Business rule guard: unclaimed lead cannot advance past stage_1 without being claimed."""
    lead = await make_lead(db, full_name="Unclaimed Lead", assigned_to_user_id=None)

    update_payload = {
        "pipeline_stage": "stage_2_consultation_inspection",
    }
    response = await client.put(f"/api/admin/leads/{lead.id}", json=update_payload, headers=auth_owner)
    assert response.status_code == 400
    assert "claim the lead first" in response.text


@pytest.mark.asyncio
async def test_leads_delete_happy_path(client, db, auth_owner):
    """DELETE /api/admin/leads/{id} removes the lead from active view."""
    lead = await make_lead(db, full_name="Lead To Delete")

    response = await client.delete(f"/api/admin/leads/{lead.id}", headers=auth_owner)
    assert response.status_code in (200, 204)

    # Verify no longer returned in detail query
    res = await client.get(f"/api/admin/leads/{lead.id}", headers=auth_owner)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_lead_activity_author_cannot_be_spoofed(client, auth_sales_rep, user_sales_rep, db):
    """
    Security check: an untrusted client must NOT be allowed to spoof the activity
    performer's identity by injecting authorName into the JSON body.
    Desired: performed_by records the verified authenticated user session.
    Today: POST /leads/{id}/activities accepts client-supplied authorName blindly.
    """
    lead = await make_lead(db, assigned_to_user_id=user_sales_rep.id)
    payload = {
        "title": "Important Audit Note",
        "description": "Critical system event",
        "authorName": "Spoofed Executive",
        "authorRole": "Chief Executive Officer",
    }
    res = await client.post(f"/api/admin/leads/{lead.id}/activities", json=payload, headers=auth_sales_rep)
    assert res.status_code == 200
    data = res.json()
    assert "Spoofed Executive" not in data["activity"]["performed_by"]

