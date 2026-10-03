"""
Smoke test for the WP-2.1 test harness.
Verifies:
  1. HTTP client can reach GET /health with real ASGITransport
  2. Transactional savepoints roll back data cleanly between tests
  3. Real auth token generation works against protected /api/admin/auth/me
"""
import pytest
from sqlalchemy import text
from app.models.client import Client
from tests.factories import make_client, make_user, login_as


@pytest.mark.asyncio
async def test_health_endpoint_http(client):
    """Verify that ASGITransport HTTP client can reach /health."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") in ("healthy", "ok") or data.get("ok") is True


@pytest.mark.asyncio
async def test_transaction_rollback_step1_create_data(db):
    """Create a client with a distinct name; verified in step 2 to vanish."""
    client = await make_client(db, full_name="Canary Rollback Client", email="canary@rollback.test")
    assert client.id is not None
    # Confirm it is queryable in this transaction
    res = await db.execute(text("SELECT full_name FROM clients WHERE email = 'canary@rollback.test'"))
    assert res.scalar_one() == "Canary Rollback Client"


@pytest.mark.asyncio
async def test_transaction_rollback_step2_verify_no_trace(db):
    """Verify the client created in step 1 was completely rolled back and leaves no trace."""
    res = await db.execute(text("SELECT full_name FROM clients WHERE email = 'canary@rollback.test'"))
    assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_real_auth_flow(client, db, auth_owner):
    """Verify real auth header authenticates against /api/admin/auth/me."""
    response = await client.get("/api/admin/auth/me", headers=auth_owner)
    assert response.status_code == 200
    body = response.json()
    assert body.get("authenticated") is True
    assert body.get("user", {}).get("role") == "owner"


@pytest.mark.asyncio
async def test_unauthenticated_protected_route_fails(client):
    """Verify unauthenticated request to /api/admin/auth/me returns 401."""
    response = await client.get("/api/admin/auth/me")
    assert response.status_code == 401
