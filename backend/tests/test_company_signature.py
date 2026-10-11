"""
Company contractor signature (Edith Guerrero) — access levels, setup/change logging,
append-only history, and contract enforcement.
"""
import pytest
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from tests.factories import (
    TEST_SIGNATURE_PNG,
    clear_company_signature,
    login_as,
    make_company_signature,
    make_contract,
    make_user,
)

SIG_URL = "/api/admin/company-signature"

FIRST_SETUP = {
    "signer_name": "Edith Guerrero",
    "signer_title": "President",
    "signature_type": "drawn",
    "signature_data": TEST_SIGNATURE_PNG,
}


async def _user_with_signature_access(db, level: str, name: str = None, permissions=None):
    """Create a non-owner user whose (unique) role grants ``level`` company-signature access."""
    role_name = f"sig_{level}_{datetime.now(timezone.utc).strftime('%H%M%S%f')}"
    user = await make_user(
        db,
        role=role_name,
        name=name or f"{level.title()} User",
        permissions=permissions if permissions is not None else ["contracts.view", "roles.view", "roles.edit", "roles.create"],
    )
    await db.execute(text("UPDATE roles SET signature_access = :lvl WHERE name = :n"), {"lvl": level, "n": role_name})
    await db.flush()
    return user


@pytest.fixture
async def no_signature(db):
    await clear_company_signature(db)
    await db.commit()


# ── Access matrix ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "level, can_view, can_edit",
    [("none", False, False), ("view", True, False), ("use", True, False), ("edit", True, True)],
)
async def test_signature_access_matrix(client, db, no_signature, level, can_view, can_edit):
    user = await _user_with_signature_access(db, level)
    await db.commit()
    headers = await login_as(user, db)

    # Status is available to every signed-in user (wizard lock)
    status_res = await client.get(f"{SIG_URL}/status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["configured"] is False

    get_res = await client.get(SIG_URL, headers=headers)
    assert get_res.status_code == (200 if can_view else 403)
    hist_res = await client.get(f"{SIG_URL}/history", headers=headers)
    assert hist_res.status_code == (200 if can_view else 403)

    put_res = await client.put(SIG_URL, json=FIRST_SETUP, headers=headers)
    assert put_res.status_code == (200 if can_edit else 403)


@pytest.mark.asyncio
async def test_profile_reports_signature_access(client, db):
    user = await _user_with_signature_access(db, "use")
    await db.commit()
    headers = await login_as(user, db)
    res = await client.get("/api/admin/auth/me", headers=headers)
    if res.status_code == 404:
        res = await client.get("/api/admin/auth/profile", headers=headers)
    assert res.status_code == 200
    body = res.json()
    payload = body.get("user", body)
    assert payload.get("signature_access") == "use"


# ── Setup / change logging ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_first_setup_is_logged_as_configured_without_reason(client, db, no_signature):
    editor = await _user_with_signature_access(db, "edit", name="Edith Admin")
    await db.commit()
    headers = await login_as(editor, db)

    res = await client.put(SIG_URL, json=FIRST_SETUP, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["action"] == "configured"
    assert body["message"].startswith("Signature configured by Edith Admin")
    sig = body["signature"]
    assert sig["version"] == 1
    assert sig["signer_name"] == "Edith Guerrero"
    assert sig["signer_title"] == "President"
    assert sig["configured_by_name"] == "Edith Admin"
    assert sig["configured_at"]

    history = (await client.get(f"{SIG_URL}/history", headers=headers)).json()["history"]
    assert len(history) == 1
    assert history[0]["action"] == "configured"
    assert history[0]["reason"] is None
    assert history[0]["changed_by_name"] == "Edith Admin"
    assert "signature_data" not in history[0]  # history list is image-free


@pytest.mark.asyncio
async def test_change_requires_reason_and_is_versioned(client, db, no_signature):
    editor = await _user_with_signature_access(db, "edit", name="Change Admin")
    await db.commit()
    headers = await login_as(editor, db)
    assert (await client.put(SIG_URL, json=FIRST_SETUP, headers=headers)).status_code == 200

    changed = {**FIRST_SETUP, "signer_title": "Chief Executive Officer"}

    # No reason → 400
    res = await client.put(SIG_URL, json=changed, headers=headers)
    assert res.status_code == 400
    assert "reason" in res.json()["detail"].lower()

    # Too-short reason → 400
    res = await client.put(SIG_URL, json={**changed, "reason": "abc"}, headers=headers)
    assert res.status_code == 400

    # Valid reason → version 2, only the title changed
    res = await client.put(SIG_URL, json={**changed, "reason": "Title changed after promotion"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["action"] == "updated"
    sig = res.json()["signature"]
    assert sig["version"] == 2
    assert sig["signer_title"] == "Chief Executive Officer"
    assert sig["configured_by_name"] == "Change Admin"

    history = (await client.get(f"{SIG_URL}/history", headers=headers)).json()["history"]
    assert [h["version"] for h in history] == [2, 1]
    assert history[0]["reason"] == "Title changed after promotion"
    assert history[0]["changed_fields"] == ["signer_title"]

    # Each version can be viewed individually, including its image
    v1 = (await client.get(f"{SIG_URL}/history/1", headers=headers)).json()
    assert v1["signer_title"] == "President"
    assert v1["signature_data"] == TEST_SIGNATURE_PNG
    assert (await client.get(f"{SIG_URL}/history/99", headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_saving_identical_signature_is_rejected(client, db, no_signature):
    editor = await _user_with_signature_access(db, "edit")
    await db.commit()
    headers = await login_as(editor, db)
    assert (await client.put(SIG_URL, json=FIRST_SETUP, headers=headers)).status_code == 200
    res = await client.put(SIG_URL, json={**FIRST_SETUP, "reason": "No real change here"}, headers=headers)
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_expected_version_conflict(client, db, no_signature):
    editor = await _user_with_signature_access(db, "edit")
    await db.commit()
    headers = await login_as(editor, db)
    assert (await client.put(SIG_URL, json={**FIRST_SETUP, "expected_version": 0}, headers=headers)).status_code == 200

    stale = {**FIRST_SETUP, "signer_title": "CEO", "reason": "Stale edit attempt", "expected_version": 0}
    res = await client.put(SIG_URL, json=stale, headers=headers)
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_invalid_drawn_signature_rejected(client, db, no_signature):
    editor = await _user_with_signature_access(db, "edit")
    await db.commit()
    headers = await login_as(editor, db)
    res = await client.put(SIG_URL, json={**FIRST_SETUP, "signature_data": "data:image/svg+xml;base64,PHN2Zz4="}, headers=headers)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_signature_history_is_append_only(db, no_signature):
    await make_company_signature(db)
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(text("UPDATE company_signature_versions SET signer_name = 'Someone Else'"))
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(text("DELETE FROM company_signature_versions"))


# ── Role Studio rules ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_only_owner_can_grant_edit_access(client, db, auth_owner):
    manager = await _user_with_signature_access(
        db, "use", permissions=["roles.view", "roles.edit", "roles.create"]
    )
    await db.commit()
    mgr_headers = await login_as(manager, db)

    # Non-owner creating a role with edit → 403; with use → OK
    res = await client.post("/api/admin/roles", json={"name": "Sig Edit Role X", "signature_access": "edit"}, headers=mgr_headers)
    assert res.status_code == 403
    res = await client.post("/api/admin/roles", json={"name": "Sig Use Role X", "signature_access": "use"}, headers=mgr_headers)
    assert res.status_code == 200, res.text
    role = res.json()["role"]
    assert role["signature_access"] == "use"

    # Invalid level → 400
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "admin"}, headers=mgr_headers)
    assert res.status_code == 400

    # Non-owner granting edit → 403; downgrading to view → OK
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "edit"}, headers=mgr_headers)
    assert res.status_code == 403
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "view"}, headers=mgr_headers)
    assert res.status_code == 200
    assert res.json()["role"]["signature_access"] == "view"

    # Owner can grant edit
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "edit"}, headers=auth_owner)
    assert res.status_code == 200
    assert res.json()["role"]["signature_access"] == "edit"

    # Non-owner can't revoke edit either, but re-sending the unchanged value is fine
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "use"}, headers=mgr_headers)
    assert res.status_code == 403
    res = await client.put(f"/api/admin/roles/{role['id']}", json={"signature_access": "edit", "description": "same"}, headers=mgr_headers)
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_users_list_exposes_access_level_but_no_signature_data(client, db, auth_owner):
    user = await _user_with_signature_access(db, "view", name="Viewer Of Signature")
    await db.commit()
    res = await client.get("/api/admin/users", headers=auth_owner)
    assert res.status_code == 200
    users = res.json()["users"]
    me = next(u for u in users if u["id"] == user.id)
    assert me["signature_access"] == "view"
    for u in users:
        assert "signature_data" not in u
        assert "is_authorized_signatory" not in u
        assert "has_signature" not in u


# ── Contract enforcement ─────────────────────────────────────────────────────

async def _client_signed_contract(db):
    contract = await make_contract(
        db,
        status="client_signed",
        contract_data={
            "client_name": "Signed Homeowner",
            "contractor_name": "Rise Up Roofing and Construction, Inc.",
            "is_signed": True,
        },
    )
    await db.execute(text("UPDATE contracts SET client_signed_at = NOW() WHERE id = :id"), {"id": contract.id})
    await db.commit()
    return contract


@pytest.mark.asyncio
async def test_counter_sign_blocked_until_signature_configured(client, db, no_signature, auth_owner):
    contract = await _client_signed_contract(db)
    res = await client.post(f"/api/admin/contracts/{contract.id}/counter-sign", json={}, headers=auth_owner)
    assert res.status_code == 409
    assert "not been set up" in res.json()["detail"]


@pytest.mark.asyncio
async def test_counter_sign_requires_use_access(client, db, no_signature):
    await make_company_signature(db)
    viewer = await _user_with_signature_access(db, "view")
    await db.commit()
    headers = await login_as(viewer, db)
    contract = await _client_signed_contract(db)
    res = await client.post(f"/api/admin/contracts/{contract.id}/counter-sign", json={}, headers=headers)
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_counter_sign_applies_company_signature_and_logs_applier(client, db, no_signature):
    await make_company_signature(db, signer_name="Edith Guerrero", signer_title="President")
    applier = await _user_with_signature_access(db, "use", name="Project Coordinator")
    await db.commit()
    headers = await login_as(applier, db)
    contract = await _client_signed_contract(db)

    # Legacy client fields in the body are ignored
    res = await client.post(
        f"/api/admin/contracts/{contract.id}/counter-sign",
        json={"contractor_name": "Impostor", "signature_data": "data:image/png;base64,AAAA"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["signed_with_version"] == 1
    assert body["contractor_signatory_name"] == "Edith Guerrero"

    row = (await db.execute(
        text("SELECT counter_signed_by, contract_data FROM contracts WHERE id = :id"), {"id": contract.id}
    )).mappings().first()
    assert row["counter_signed_by"] == applier.id
    cdata = row["contract_data"]
    assert cdata["contractor_signature_data"] == TEST_SIGNATURE_PNG
    assert cdata["contractor_signature_name"] == "Edith Guerrero"
    assert cdata["contractor_signatory_title"] == "President"
    assert cdata["counter_signed_by_name"] == "Project Coordinator"
    assert cdata["contractor_name"] == "Rise Up Roofing and Construction, Inc."

    audit_changes = (await db.execute(
        text("""
            SELECT changes FROM audit_logs
            WHERE action = 'contract.counter_signed' AND resource_type = 'contract' AND CAST(resource_id AS TEXT) = :rid
            ORDER BY id DESC LIMIT 1
        """),
        {"rid": str(contract.id)},
    )).scalar()
    if audit_changes is not None:
        import json as _json
        changes = _json.loads(audit_changes) if isinstance(audit_changes, str) else audit_changes
        assert changes["applied_by"] == "Project Coordinator"
        assert changes["contractor_signatory_name"] == "Edith Guerrero"
        assert changes["company_signature_version"] == 1


@pytest.mark.asyncio
async def test_send_and_sms_blocked_until_signature_configured(client, db, no_signature, auth_owner):
    contract = await make_contract(db, status="draft", client_name="Waiting Homeowner")
    res = await client.post(
        f"/api/admin/contracts/{contract.id}/send", json={"to_email": "x@example.com"}, headers=auth_owner
    )
    assert res.status_code == 409
    res = await client.post(
        f"/api/admin/contracts/{contract.id}/send-sms", json={"phone": "760-555-0100"}, headers=auth_owner
    )
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_build_stamps_configured_signatory(client, db, no_signature, auth_owner):
    await make_company_signature(db, signer_name="Edith Guerrero", signer_title="President")
    await db.commit()
    res = await client.post(
        "/api/admin/contracts/build",
        json={"contract_data": {
            "client_name": "Stamp Homeowner",
            "contractor_signatory_name": "Client Supplied Name",
            "representative_name": "Legacy Rep",
        }},
        headers=auth_owner,
    )
    assert res.status_code == 200, res.text
    cdata = (await db.execute(
        text("SELECT contract_data FROM contracts WHERE id = :id"), {"id": res.json()["contract_id"]}
    )).scalar()
    assert cdata["contractor_signatory_name"] == "Edith Guerrero"
    assert cdata["contractor_signatory_title"] == "President"
    assert "representative_name" not in cdata
