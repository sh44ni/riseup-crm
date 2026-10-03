"""
Authorization Matrix Tests (WP-2.4).
Verifies:
  1. (role, endpoint, resource_ownership) -> expected HTTP status
  2. Anonymous access returns 401 across all protected routes
  3. Viewer cannot perform destructive or mutation operations (403)
  4. Role scoping and IDOR guards (own vs foreign resources)
  5. Strict-xfail markers for known insecure behaviors to be resolved in P3
"""
import pytest
from sqlalchemy import text
from tests.factories import (
    make_user, make_lead, make_client, make_estimate, make_contract, login_as
)


# ── Anonymous Access (Must Return 401) ────────────────────────────────────────

@pytest.mark.parametrize("method,endpoint", [
    ("GET", "/api/admin/leads"),
    ("POST", "/api/admin/leads"),
    ("GET", "/api/admin/clients"),
    ("GET", "/api/admin/estimates"),
    ("POST", "/api/admin/estimates"),
    ("GET", "/api/admin/contracts"),
    ("GET", "/api/admin/jobs"),
    ("GET", "/api/admin/invoices"),
    ("GET", "/api/admin/calendar/events"),
    ("GET", "/api/admin/users/me/tasks"),
    ("GET", "/api/admin/roles"),
    ("GET", "/api/admin/export"),
], ids=lambda val: str(val))
@pytest.mark.asyncio
async def test_anonymous_access_denied(client, method, endpoint):
    """Anonymous requests to admin endpoints must always return 401 Unauthorized."""
    response = await client.request(method, endpoint)
    assert response.status_code == 401, f"Expected 401 for {method} {endpoint}, got {response.status_code}"


# ── Viewer Role Mutation Guards (Must Return 403) ─────────────────────────────

@pytest.mark.parametrize("method,endpoint,payload", [
    ("POST", "/api/admin/leads", {"full_name": "Test", "phone": "760-555-0100"}),
    ("POST", "/api/admin/estimates", {"customer_name": "Test", "service_type": "tile", "roof_squares": 20, "material_type": "Tile"}),
    ("POST", "/api/admin/contracts/build", {"lead_id": 1, "contract_type": "standard"}),
    ("POST", "/api/admin/roles", {"name": "NewRole", "description": "Test"}),
    ("DELETE", "/api/admin/leads/1", None),
], ids=lambda val: str(val))
@pytest.mark.asyncio
async def test_viewer_mutation_forbidden(client, auth_viewer, method, endpoint, payload):
    """Viewer role must receive 403 Forbidden when attempting creation or deletion."""
    kwargs = {"headers": auth_viewer}
    if payload:
        kwargs["json"] = payload
    response = await client.request(method, endpoint, **kwargs)
    assert response.status_code == 403, f"Expected 403 for viewer on {method} {endpoint}, got {response.status_code}"


# ── Ownership & IDOR Authorization Matrix ─────────────────────────────────────

@pytest.mark.asyncio
async def test_sales_rep_can_view_own_lead(client, db):
    """Sales rep with 'own' scope can view their assigned lead (200)."""
    rep = await make_user(db, role="sales_rep")
    lead = await make_lead(db, assigned_to_user_id=rep.id, created_by_user_id=rep.id)
    headers = await login_as(rep, db)

    response = await client.get(f"/api/admin/leads/{lead.id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert (data.get("lead", {}).get("id") or data.get("id")) == lead.id


@pytest.mark.asyncio
async def test_sales_rep_nonexistent_lead_returns_404(client, db):
    """Sales rep querying nonexistent lead returns 404 Not Found."""
    rep = await make_user(db, role="sales_rep")
    headers = await login_as(rep, db)

    response = await client.get("/api/admin/leads/999999", headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_sales_rep_cannot_view_foreign_lead(client, db):
    """Sales rep with 'own' scope receives 403 when requesting someone else's lead."""
    rep = await make_user(db, role="sales_rep")
    owner = await make_user(db, role="owner")
    foreign_lead = await make_lead(db, assigned_to_user_id=owner.id, created_by_user_id=owner.id)
    headers = await login_as(rep, db)

    response = await client.get(f"/api/admin/leads/{foreign_lead.id}", headers=headers)
    assert response.status_code == 403


# ── Known Insecure Behaviors (Strict xfail backlog for P3) ───────────────────

@pytest.mark.asyncio
async def test_sales_rep_cannot_view_foreign_estimate(client, db):
    """
    SECURE EXPECTATION: A sales rep with scope 'own' must NOT be able to view foreign estimates.
    Current behavior: GET /api/admin/estimates/{id} does not check ownership and returns 200.
    In P3, this must return 403 Forbidden.
    """
    rep = await make_user(db, role="sales_rep")
    owner = await make_user(db, role="owner")
    foreign_est = await make_estimate(db, created_by=owner.id)
    headers = await login_as(rep, db)

    response = await client.get(f"/api/admin/estimates/{foreign_est.id}", headers=headers)
    # The secure expectation is 403 Forbidden. Current code returns 200, causing xfail to succeed.
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_sales_rep_cannot_draft_foreign_contract_by_lead(client, db):
    """
    SECURE EXPECTATION: Sales rep must NOT access draft contracts for foreign leads.
    Current behavior: draft-by-lead returns contract details without checking lead ownership.
    In P3, this must return 403 Forbidden.
    """
    rep = await make_user(db, role="sales_rep")
    owner = await make_user(db, role="owner")
    foreign_lead = await make_lead(db, assigned_to_user_id=owner.id, created_by_user_id=owner.id)
    contract = await make_contract(db, lead_id=foreign_lead.id, created_by_user_id=owner.id, status="draft")
    headers = await login_as(rep, db)

    response = await client.get(f"/api/admin/contracts/draft-by-lead/{foreign_lead.id}", headers=headers)
    # Secure expectation: 403 Forbidden. Current code returns 200 with exists=True.
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_export_respects_user_scope(client, db):
    """
    SECURE EXPECTATION: Users with 'own' scope exporting leads should only get their own leads in the CSV.
    Current behavior: /export queries `SELECT ... FROM leads` with no WHERE clause.
    In P3, this must filter by assigned_to_user_id when user scope is 'own'.
    """
    rep = await make_user(db, role="sales_rep", permissions=["leads:export", "leads.view:own"])
    owner = await make_user(db, role="owner")

    await make_lead(db, full_name="Own Lead For Export", assigned_to_user_id=rep.id, created_by_user_id=rep.id)
    await make_lead(db, full_name="Secret Foreign Lead", assigned_to_user_id=owner.id, created_by_user_id=owner.id)

    headers = await login_as(rep, db)
    response = await client.get("/api/admin/export?type=leads", headers=headers)
    assert response.status_code == 200
    csv_text = response.text

    # Secure expectation: "Secret Foreign Lead" must NOT appear in the CSV
    assert "Secret Foreign Lead" not in csv_text


# ── Protected Owner Role Security (P0 Regression Guard) ──────────────────────

@pytest.mark.asyncio
async def test_protected_owner_role_cannot_be_deleted(client, db, auth_owner):
    """Verify owner role cannot be deleted (enforced by P0 security fix)."""
    res = await db.execute(text("SELECT id FROM roles WHERE is_protected = true LIMIT 1"))
    owner_role_id = res.scalar_one_or_none()
    assert owner_role_id is not None

    response = await client.delete(f"/api/admin/roles/{owner_role_id}", headers=auth_owner)
    assert response.status_code == 403
    assert "Cannot delete protected system role" in response.text
