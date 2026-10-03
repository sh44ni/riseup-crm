"""
Characterisation tests for Contracts domain.
Tests build, draft update, send, public view, public sign, and counter-sign.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import text
from tests.factories import make_lead, make_client, make_contract, make_user, login_as


@pytest.mark.asyncio
async def test_contracts_list_happy_path(client, auth_owner, db):
    """GET /api/admin/contracts returns list of contracts."""
    contract = await make_contract(db, status="draft")

    res = await client.get("/api/admin/contracts", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "contracts" in data
    assert any(c["id"] == contract.id for c in data["contracts"])


@pytest.mark.asyncio
async def test_contracts_build_happy_path(client, auth_owner, db):
    """POST /api/admin/contracts/build creates draft contract and generates PDF."""
    lead = await make_lead(db, full_name="Build Contract Homeowner")

    payload = {
        "lead_id": lead.id,
        "contract_data": {
            "client_name": "Build Contract Homeowner",
            "project_address": "123 Palm Ave, San Diego, CA",
            "scope_title": "Tile Roof Restoration",
            "contract_price": "$22,500.00",
            "downpayment": "$1,000.00",
            "payment_schedule": [
                {"description": "Initial Down Payment", "amount": "$1,000.00"},
                {"description": "Final Completion", "amount": "$21,500.00"},
            ],
        },
    }

    res = await client.post("/api/admin/contracts/build", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "contract_id" in data
    assert data["status"] == "draft"
    assert "contract_number" in data
    assert "pdf_url" in data

    # Verify persisted in database
    db_res = await db.execute(text("SELECT id, status, contract_number FROM contracts WHERE id = :id"), {"id": data["contract_id"]})
    row = db_res.first()
    assert row is not None
    assert row.status == "draft"


@pytest.mark.asyncio
async def test_contracts_draft_update(client, auth_owner, db):
    """PUT /api/admin/contracts/{id}/draft updates contract draft fields."""
    contract = await make_contract(db, status="draft")

    payload = {
        "contract_data": {
            "scope_title": "Updated Scope of Roofing Work",
            "contract_price": "$28,000.00",
        }
    }

    res = await client.put(f"/api/admin/contracts/{contract.id}/draft", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["contract_id"] == contract.id

    # Verify persisted in database
    db_res = await db.execute(text("SELECT contract_data FROM contracts WHERE id = :id"), {"id": contract.id})
    saved_data = db_res.scalar()
    import json
    parsed = json.loads(saved_data) if isinstance(saved_data, str) else saved_data
    assert parsed["scope_title"] == "Updated Scope of Roofing Work"


@pytest.mark.asyncio
async def test_contracts_send_happy_path(client, auth_owner, db):
    """POST /api/admin/contracts/{id}/send marks contract sent and emails client."""
    lead = await make_lead(db, full_name="Send Homeowner", email="sendtest@example.com")
    contract = await make_contract(
        db,
        lead_id=lead.id,
        status="draft",
        client_name="Send Homeowner",
        client_email="sendtest@example.com",
    )

    payload = {
        "to_email": "sendtest@example.com",
        "custom_message": "Please review and sign your roofing contract.",
    }

    res = await client.post(f"/api/admin/contracts/{contract.id}/send", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "sent"

    # Verify contract status updated in DB
    db_res = await db.execute(text("SELECT status FROM contracts WHERE id = :id"), {"id": contract.id})
    assert db_res.scalar() == "sent"


@pytest.mark.asyncio
async def test_contracts_public_view(client, db):
    """GET /api/contract/{token} allows public view of contract signing details."""
    token = "public_test_token_12345678"
    contract = await make_contract(
        db,
        signing_token=token,
        status="sent",
        client_name="Public Signer",
    )

    res = await client.get(f"/api/contract/{token}")
    assert res.status_code == 200
    data = res.json()
    assert "contract" in data
    assert data["contract"]["id"] == contract.id
    assert data["contract"]["clientName"] == "Public Signer"


@pytest.mark.asyncio
async def test_contracts_public_sign(client, db):
    """POST /api/contract/{token}/sign captures signature and statutory CSLB acknowledgments."""
    token = "public_sign_token_12345678"
    contract = await make_contract(
        db,
        signing_token=token,
        status="sent",
        client_name="John Homeowner",
    )

    payload = {
        "client_initials": "JH",
        "signer_name": "John Homeowner",
        "signature_type": "typed",
        "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "is_senior_citizen": False,
        "agreed_terms": True,
        "agreed_scope": True,
        "agreed_milestones": True,
        "agreed_refund": True,
        "agreed_disclosures": True,
        "agreed_cancellation": True,
    }

    res = await client.post(f"/api/contract/{token}/sign", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # Check database
    db_res = await db.execute(text("SELECT status, client_initials, client_signed_at FROM contracts WHERE id = :id"), {"id": contract.id})
    row = db_res.mappings().first()
    assert row["status"] == "client_signed"
    assert row["client_initials"] == "JH"
    assert row["client_signed_at"] is not None


@pytest.mark.asyncio
async def test_contracts_counter_sign_happy_path(client, db):
    """
    POST /api/admin/contracts/{id}/counter-sign allows an authorized signatory
    to execute the contract, moving it to 'signed' (fully executed).
    """
    # 1. Create an authorized signatory user
    signatory_user = await make_user(
        db,
        role="owner",
        name="Marc Signatory",
        email="signatory@test.local",
    )
    # Configure personal signature on the user record and ensure role is authorized signatory
    await db.execute(
        text("""
            UPDATE users
            SET signature_data = 'data:image/png;base64,mock_contractor_sig',
                signature_type = 'drawn',
                signature_title = 'Chief Executive Officer'
            WHERE id = :uid
        """),
        {"uid": signatory_user.id}
    )
    await db.execute(
        text("UPDATE roles SET is_authorized_signatory = true WHERE name = 'Owner'")
    )
    await db.commit()

    auth_signatory = await login_as(signatory_user, db)

    # 2. Create a contract in client_signed state
    contract = await make_contract(
        db,
        status="client_signed",
        contract_data={
            "client_name": "Executed Homeowner",
            "project_address": "777 Sunburst Way",
            "is_signed": True,
            "client_initials": "EH",
            "client_signed_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    # Set client_signed_at on contract record
    await db.execute(
        text("UPDATE contracts SET client_signed_at = NOW() WHERE id = :id"),
        {"id": contract.id}
    )
    await db.commit()

    payload = {
        "contractor_name": "Marc Signatory",
        "contractor_title": "Chief Executive Officer",
        "signature_data": "data:image/png;base64,mock_contractor_sig",
        "signature_type": "drawn",
    }

    res = await client.post(f"/api/admin/contracts/{contract.id}/counter-sign", json=payload, headers=auth_signatory)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "signed"

    # Verify status in database
    db_res = await db.execute(text("SELECT status, counter_signed_at FROM contracts WHERE id = :id"), {"id": contract.id})
    row = db_res.mappings().first()
    assert row["status"] == "signed"
    assert row["counter_signed_at"] is not None
