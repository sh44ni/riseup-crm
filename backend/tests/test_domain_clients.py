"""
Characterisation tests for Clients domain.
Tests list, create, existing client onboarding, client 360, delete, and GET sync write side-effect xfail.
"""
import pytest
from sqlalchemy import text
from tests.factories import make_client, make_lead


@pytest.mark.asyncio
async def test_clients_list_happy_path(client, auth_owner, db):
    """GET /api/admin/clients returns client list with counts."""
    c = await make_client(db, full_name="Listed Client", phone="760-555-0191", email="listed@test.local")

    res = await client.get("/api/admin/clients", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "clients" in data
    assert "total" in data
    assert any(cl["id"] == c.id for cl in data["clients"])


@pytest.mark.asyncio
async def test_clients_create_happy_path(client, auth_owner, db):
    """POST /api/admin/clients creates a new client record and profile activity."""
    payload = {
        "fullName": "New Homeowner Client",
        "email": "homeowner_new@test.local",
        "phone": "760-555-0192",
        "address": "100 Coastal Way",
        "city": "Oceanside",
        "zip": "92054",
        "propertyType": "Residential",
        "roofType": "Tile",
    }

    res = await client.post("/api/admin/clients", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "client" in data
    created_id = data["client"]["id"]

    # Verify persisted in database
    db_res = await db.execute(text("SELECT full_name, email, phone FROM clients WHERE id = :id"), {"id": created_id})
    row = db_res.mappings().first()
    assert row["full_name"] == "New Homeowner Client"
    assert row["email"] == "homeowner_new@test.local"


@pytest.mark.asyncio
async def test_clients_create_validation_error(client, auth_owner):
    """POST /api/admin/clients requires full_name and at least one contact method."""
    # Missing phone and email
    res = await client.post("/api/admin/clients", json={"fullName": "No Contact User"}, headers=auth_owner)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_clients_create_existing_onboard(client, auth_owner, db):
    """
    POST /api/admin/clients/existing onboards an existing client,
    linking a client row and a pipeline card.
    """
    payload = {
        "full_name": "Historical Client",
        "phone": "760-555-0193",
        "email": "historical@test.local",
        "address": "200 Heritage Blvd",
        "city": "Carlsbad",
        "zip": "92008",
        "pipeline_stage": "stage_4_contract",
        "contract_value": 35000.0,
    }

    res = await client.post("/api/admin/clients/existing", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["client"]["full_name"] == "Historical Client"
    assert data["lead"] is not None
    assert data["lead"]["pipeline_stage"] == "stage_4_contract"


@pytest.mark.asyncio
async def test_clients_get_detail_360(client, auth_owner, db):
    """GET /api/admin/clients/{id} returns comprehensive 360 data."""
    c = await make_client(db, full_name="Client 360", phone="760-555-0194", email="client360@test.local")

    res = await client.get(f"/api/admin/clients/{c.id}", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "client" in data
    assert data["client"]["id"] == c.id
    assert data["client"]["full_name"] == "Client 360"
    assert "estimates" in data
    assert "leads" in data

    missing_res = await client.get("/api/admin/clients/999999", headers=auth_owner)
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_clients_delete_happy_path(client, auth_owner, db):
    """DELETE /api/admin/clients/{id} soft-deletes (archives) the client setting status to inactive."""
    c = await make_client(db, full_name="To Delete", phone="760-555-0195", email="delete_me@test.local")

    res = await client.delete(f"/api/admin/clients/{c.id}", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "archived" in data["message"].lower()

    # Verify soft-deleted in database (status updated to 'inactive')
    db_res = await db.execute(text("SELECT status FROM clients WHERE id = :id"), {"id": c.id})
    assert db_res.scalar() == "inactive"


@pytest.mark.asyncio
async def test_clients_get_sync_query_does_not_mutate(client, auth_owner, db):
    """
    In REST architecture (RFC 9110), HTTP GET must be a safe method with no side-effects.
    Today: GET /api/admin/clients?sync=true runs auto_heal_dataflow_sync which mutates
    unlinked leads by creating and associating client records.
    Desired: GET remains safe and does not modify database records.
    """
    lead = await make_lead(db, client_id=None, full_name="Unlinked Sync Lead", email="sync_unlinked@test.local")
    assert lead.client_id is None

    # Safe GET should not modify database state
    res = await client.get("/api/admin/clients?sync=true", headers=auth_owner)
    assert res.status_code == 200

    # In a safe GET, lead.client_id must remain None
    refreshed = await db.scalar(text("SELECT client_id FROM leads WHERE id = :id"), {"id": lead.id})
    assert refreshed is None
