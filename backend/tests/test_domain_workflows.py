"""
Comprehensive End-to-End Domain Scenario Workflow Tests.
Simulates the complete real-world customer journey:
Lead Creation → Claim → Estimate Creation → Send Estimate →
Build Contract → Send Contract → Client Digital Signature → Contractor Counter-Signature.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import text
from tests.factories import make_user, login_as


@pytest.mark.asyncio
async def test_full_lead_to_contract_journey(client, db):
    """
    Complete lifecycle integration test:
    1. Public / Intake: Create lead
    2. Sales Rep claims lead
    3. Rep drafts estimate and sends proposal
    4. Rep builds formal California home improvement contract
    5. Rep sends contract to homeowner
    6. Homeowner reviews via public link and electronically executes (with CSLB BPC 7159 disclosures)
    7. Authorized Company Signatory reviews and counter-signs, fully executing the contract
    """
    # ── Setup Staff Users ──
    owner = await make_user(db, role="owner", name="Edith Signatory", email="edith@test.local")
    # Grant authorized signatory role & configure signature
    await db.execute(text("UPDATE roles SET is_authorized_signatory = true WHERE name = 'Owner'"))
    await db.execute(text("""
        UPDATE users
        SET signature_data = 'data:image/png;base64,mock_edith_sig',
            signature_type = 'drawn',
            signature_title = 'President'
        WHERE id = :uid
    """), {"uid": owner.id})
    await db.commit()
    auth_owner = await login_as(owner, db)

    # ── Step 1: Create Lead ──
    lead_payload = {
        "full_name": "Eleanor Vance",
        "email": "eleanor@hillhouse.local",
        "phone": "760-555-0811",
        "address": "1124 Hill House Rd",
        "city": "Fallbrook",
        "zip": "92028",
        "service_type": "Tile Roof Replacement",
    }
    lead_res = await client.post("/api/admin/leads", json=lead_payload, headers=auth_owner)
    assert lead_res.status_code == 200
    lead_data = lead_res.json()
    lead_id = lead_data.get("id") or lead_data.get("lead", {}).get("id")
    assert lead_id is not None

    # ── Step 2: Claim Lead ──
    claim_res = await client.post(f"/api/admin/pipeline/{lead_id}/claim", headers=auth_owner)
    assert claim_res.status_code == 200
    assert claim_res.json()["ok"] is True

    # ── Step 3: Create & Calculate Estimate ──
    est_payload = {
        "customer_name": "Eleanor Vance",
        "customer_email": "eleanor@hillhouse.local",
        "customer_phone": "760-555-0811",
        "customer_address": "1124 Hill House Rd",
        "lead_id": lead_id,
        "roof_squares": 32.0,
        "roof_pitch": "5:12",
        "stories": 1,
        "tearoff_layers": 1,
        "material_id": "oc_duration",
        "margin_pct": 30.0,
    }
    est_res = await client.post("/api/admin/estimates", json=est_payload, headers=auth_owner)
    assert est_res.status_code == 200
    est_json = est_res.json()
    assert est_json["ok"] is True
    estimate = est_json["estimate"]
    estimate_id = estimate["id"]
    assert estimate["total"] > 0
    assert estimate["status"] == "draft"

    # Send Estimate Proposal
    send_est_res = await client.post(
        f"/api/admin/estimates/{estimate_id}/send-estimate",
        json={"customerEmail": "eleanor@hillhouse.local", "customerName": "Eleanor Vance"},
        headers=auth_owner
    )
    assert send_est_res.status_code == 200

    # ── Step 4: Build Contract ──
    contract_payload = {
        "lead_id": lead_id,
        "estimate_id": estimate_id,
        "contract_data": {
            "client_name": "Eleanor Vance",
            "client_email": "eleanor@hillhouse.local",
            "project_address": "1124 Hill House Rd, Fallbrook, CA 92028",
            "scope_title": "Complete 32-Square Concrete Tile Roof Installation",
            "contract_price": f"${estimate['total']:,.2f}",
            "downpayment": "$1,000.00",
            "payment_schedule": [
                {"description": "Down Payment", "amount": "$1,000.00"},
                {"description": "Underlayment & Materials", "amount": f"${estimate['total']*0.5:,.2f}"},
                {"description": "Final Completion", "amount": f"${estimate['total']*0.5 - 1000:,.2f}"},
            ],
        },
    }
    build_res = await client.post("/api/admin/contracts/build", json=contract_payload, headers=auth_owner)
    assert build_res.status_code == 200
    build_data = build_res.json()
    contract_id = build_data["contract_id"]
    assert build_data["status"] == "draft"

    # ── Step 5: Send Contract to Homeowner ──
    send_res = await client.post(
        f"/api/admin/contracts/{contract_id}/send",
        json={"to_email": "eleanor@hillhouse.local", "custom_message": "Here is your roofing contract."},
        headers=auth_owner
    )
    assert send_res.status_code == 200
    assert send_res.json()["success"] is True

    # Verify contract status updated to sent, lead moved to contract_sent
    c_check = await db.execute(text("SELECT status, signing_token FROM contracts WHERE id = :id"), {"id": contract_id})
    c_row = c_check.mappings().first()
    assert c_row["status"] == "sent"
    signing_token = c_row["signing_token"]
    assert signing_token is not None

    lead_check = await db.execute(text("SELECT pipeline_stage FROM leads WHERE id = :id"), {"id": lead_id})
    assert lead_check.scalar() == "contract_sent"

    # ── Step 6: Public Homeowner View & Signature Execution ──
    # Homeowner loads public wizard
    pub_view = await client.get(f"/api/contract/{signing_token}")
    assert pub_view.status_code == 200
    assert pub_view.json()["contract"]["clientName"] == "Eleanor Vance"

    # Homeowner signs with California CSLB statutory acknowledgments
    sign_payload = {
        "client_initials": "EV",
        "signer_name": "Eleanor Vance",
        "signature_type": "typed",
        "signature_data": "data:image/png;base64,mock_homeowner_signature",
        "is_senior_citizen": False,
        "agreed_terms": True,
        "agreed_scope": True,
        "agreed_milestones": True,
        "agreed_refund": True,
        "agreed_disclosures": True,
        "agreed_cancellation": True,
    }
    sign_res = await client.post(f"/api/contract/{signing_token}/sign", json=sign_payload)
    assert sign_res.status_code == 200
    assert sign_res.json()["success"] is True

    # Verify contract is client_signed and estimate is accepted
    c_signed = await db.execute(text("SELECT status, client_initials, client_signed_at FROM contracts WHERE id = :id"), {"id": contract_id})
    c_signed_row = c_signed.mappings().first()
    assert c_signed_row["status"] == "client_signed"
    assert c_signed_row["client_initials"] == "EV"
    assert c_signed_row["client_signed_at"] is not None

    est_check = await db.execute(text("SELECT status FROM estimates WHERE id = :id"), {"id": estimate_id})
    assert est_check.scalar() == "accepted"

    # ── Step 7: Authorized Signatory Counter-Signs ──
    counter_payload = {
        "contractor_name": "Edith Signatory",
        "contractor_title": "President",
        "signature_data": "data:image/png;base64,mock_edith_sig",
        "signature_type": "drawn",
    }
    counter_res = await client.post(f"/api/admin/contracts/{contract_id}/counter-sign", json=counter_payload, headers=auth_owner)
    assert counter_res.status_code == 200
    assert counter_res.json()["success"] is True
    assert counter_res.json()["status"] == "signed"

    # Verify contract fully executed
    final_contract = await db.execute(text("SELECT status, counter_signed_at FROM contracts WHERE id = :id"), {"id": contract_id})
    fc_row = final_contract.mappings().first()
    assert fc_row["status"] == "signed"
    assert fc_row["counter_signed_at"] is not None

    # Verify lead pipeline stage advanced to contract_signed and won
    final_lead = await db.execute(text("SELECT pipeline_stage, status FROM leads WHERE id = :id"), {"id": lead_id})
    fl_row = final_lead.mappings().first()
    assert fl_row["pipeline_stage"] == "contract_signed"
    assert fl_row["status"] == "won"
