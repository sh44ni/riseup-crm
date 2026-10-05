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


@pytest.mark.asyncio
async def test_lead_and_client_notes_sync_and_persistence(client, db, auth_owner):
    """
    Test that field notes added or edited on a lead or client synchronize
    across both records and reload properly from the Client 360 source of truth.
    """
    from tests.factories import make_client, make_lead

    # 1. Create client and linked lead
    c = await make_client(db, full_name="Homeowner Field Notes", email="homeowner_notes@test.local")
    l = await make_lead(db, client_id=c.id, full_name="Homeowner Field Notes", email="homeowner_notes@test.local")

    # 2. Add note via PUT /api/admin/leads/{l.id}
    note_1 = "[10/05/2026, 3:30 AM — Sylvester (Owner)]\nInitial roof damage observed on east slope."
    update_res = await client.put(f"/api/admin/leads/{l.id}", json={"notes": note_1}, headers=auth_owner)
    assert update_res.status_code == 200
    assert update_res.json()["lead"]["notes"] == note_1

    # 3. Verify lead detail loads note from client record as source of truth
    detail_res = await client.get(f"/api/admin/leads/{l.id}", headers=auth_owner)
    assert detail_res.status_code == 200
    assert detail_res.json()["lead"]["notes"] == note_1

    # 4. Verify client record itself has the synchronized note
    client_res = await client.get(f"/api/admin/clients/{c.id}", headers=auth_owner)
    assert client_res.status_code == 200
    assert client_res.json()["client"]["notes"] == note_1

    # 5. Verify pipeline endpoint includes the client note
    pipeline_res = await client.get("/api/admin/pipeline", headers=auth_owner)
    assert pipeline_res.status_code == 200
    pipe_deals = []
    for stage_deals in pipeline_res.json().get("stages", {}).values():
        pipe_deals.extend(stage_deals)
    matching_deal = next((d for d in pipe_deals if d["id"] == l.id), None)
    assert matching_deal is not None
    assert matching_deal["notes"] == note_1

    # 6. Edit note via PATCH /api/admin/clients/{c.id} and verify sync back to lead
    note_edited = f"{note_1}\n\n[10/05/2026, 3:45 AM — Sylvester (Owner)]\nEstimated 4 replacement tiles needed."
    c_update_res = await client.patch(f"/api/admin/clients/{c.id}", json={"notes": note_edited}, headers=auth_owner)
    assert c_update_res.status_code == 200
    assert c_update_res.json()["client"]["notes"] == note_edited

    # 7. Verify lead detail reflects edited note
    detail_res2 = await client.get(f"/api/admin/leads/{l.id}", headers=auth_owner)
    assert detail_res2.status_code == 200
    assert detail_res2.json()["lead"]["notes"] == note_edited


