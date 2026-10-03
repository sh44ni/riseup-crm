"""
Characterisation tests for Pipeline domain.
Tests kanban board list, claim lead, forward stage move, backward move guard,
unclaimed stage guard, and follow-up logging.
"""
import pytest
from sqlalchemy import text
from tests.factories import make_lead, make_user, login_as


@pytest.mark.asyncio
async def test_pipeline_board_happy_path(client, auth_owner, db, user_owner):
    """GET /api/admin/pipeline returns grouped kanban columns and deals."""
    lead = await make_lead(
        db,
        full_name="Kanban Lead",
        pipeline_stage="new_leads",
        assigned_to_user_id=user_owner.id,
    )

    res = await client.get("/api/admin/pipeline", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "granular_stages" in data
    assert "counts" in data


@pytest.mark.asyncio
async def test_pipeline_claim_lead(client, db, user_owner, auth_owner):
    """POST /api/admin/pipeline/{lead_id}/claim assigns unclaimed lead to current user."""
    lead = await make_lead(db, full_name="Unclaimed Lead", assigned_to_user_id=None)

    res = await client.post(f"/api/admin/pipeline/{lead.id}/claim", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True

    # Verify assigned in DB
    db_res = await db.execute(text("SELECT assigned_to_user_id FROM leads WHERE id = :id"), {"id": lead.id})
    assert db_res.scalar() == user_owner.id


@pytest.mark.asyncio
async def test_pipeline_advance_stage_happy_path(client, db, user_owner, auth_owner):
    """PUT /api/admin/pipeline/{lead_id}/stage moves lead forward in the pipeline."""
    lead = await make_lead(
        db,
        full_name="Advance Deal",
        pipeline_stage="cold_lead",
        assigned_to_user_id=user_owner.id,
    )

    payload = {
        "stage": "inspection_scheduled",
        "notes": "Inspection confirmed for next Tuesday",
    }
    res = await client.put(f"/api/admin/pipeline/{lead.id}/stage", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True

    # Verify stage updated in DB
    db_res = await db.execute(text("SELECT pipeline_stage FROM leads WHERE id = :id"), {"id": lead.id})
    assert db_res.scalar() == "inspection_scheduled"


@pytest.mark.asyncio
async def test_pipeline_backward_move_guard(client, db, user_owner, auth_owner):
    """Business rule guard: cannot move deal backward in progression unless marked lost."""
    lead = await make_lead(
        db,
        full_name="Backward Guard Deal",
        pipeline_stage="inspection_scheduled",
        assigned_to_user_id=user_owner.id,
    )

    # Attempt to move backward to initial_call
    payload = {
        "stage": "initial_call",
    }
    res = await client.put(f"/api/admin/pipeline/{lead.id}/stage", json=payload, headers=auth_owner)
    assert res.status_code == 400
    assert "backward" in res.text.lower()


@pytest.mark.asyncio
async def test_pipeline_unclaimed_lead_guard(client, db, auth_owner):
    """Business rule guard: unclaimed lead cannot advance past intake without claiming."""
    lead = await make_lead(db, full_name="Unclaimed Intake Deal", assigned_to_user_id=None)

    payload = {
        "stage": "inspection_scheduled",
    }
    res = await client.put(f"/api/admin/pipeline/{lead.id}/stage", json=payload, headers=auth_owner)
    assert res.status_code == 400
    assert "claim the lead first" in res.text.lower()


@pytest.mark.asyncio
async def test_pipeline_log_follow_up(client, db, user_owner, auth_owner):
    """POST /api/admin/pipeline/{lead_id}/follow-up records customer communication."""
    lead = await make_lead(
        db,
        full_name="Follow Up Deal",
        pipeline_stage="estimate_sent",
        assigned_to_user_id=user_owner.id,
    )

    payload = {
        "method": "call",
        "notes": "Spoke with client, requested review of shingle colors",
        "outcome": "spoke_with_client",
    }
    res = await client.post(f"/api/admin/pipeline/{lead.id}/follow-up", json=payload, headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
