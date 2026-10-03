import pytest
import hmac
import hashlib
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.config import settings
from app.core.csrf import generate_csrf_token, verify_csrf_token
from app.core.authz import Principal, ensure_owns
from app.core.permissions import AuthUser, check_resource_access
from app.core.errors import Forbidden
from app.core.public_routes import is_public_backend_route, PUBLIC_BACKEND_ROUTES
from tests.factories import make_user


@pytest.mark.asyncio
async def test_csrf_token_generation_and_verification():
    token = "a" * 64
    csrf = generate_csrf_token(token)
    assert csrf is not None
    assert len(csrf) == 64
    assert verify_csrf_token(csrf, token) is True
    assert verify_csrf_token("invalid_csrf_token", token) is False
    assert verify_csrf_token(csrf, "b" * 64) is False
    assert verify_csrf_token("", token) is False


@pytest.mark.asyncio
async def test_login_sets_cookie_and_csrf(client: AsyncClient, db: AsyncSession):
    # Create test active user with scrypt credentials
    user = await make_user(db, role="owner", email="p5_login_test@example.com")
    await db.commit()

    # The factory sets a known password; let's log in
    res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert res.status_code == 200, res.text

    data = res.json()
    assert data["ok"] is True
    assert "token" in data
    assert "csrf_token" in data
    assert data["user"]["kind"] == "user"
    assert data["user"]["user_id"] == user.id

    # Check cookies
    cookies = res.cookies
    assert settings.COOKIE_NAME in cookies or "admin_session" in cookies
    session_cookie = cookies.get(settings.COOKIE_NAME) or cookies.get("admin_session")
    assert session_cookie is not None

    # Check Set-Cookie headers contain HttpOnly and SameSite
    set_cookie_headers = res.headers.get_list("set-cookie")
    has_httponly = any("httponly" in h.lower() for h in set_cookie_headers)
    has_samesite = any("samesite=lax" in h.lower() for h in set_cookie_headers)
    assert has_httponly is True
    assert has_samesite is True


@pytest.mark.asyncio
async def test_auth_me_returns_profile_csrf_and_no_store(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, role="owner", email="p5_me_test@example.com")
    await db.commit()
    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200, login_res.text
    session_token = login_res.json()["token"]

    # Call /api/admin/auth/me with session cookie
    client.cookies.set(settings.COOKIE_NAME, session_token)
    me_res = await client.get("/api/admin/auth/me")
    assert me_res.status_code == 200, me_res.text
    data = me_res.json()
    assert data["authenticated"] is True
    assert data["csrf_token"] is not None
    assert data["user"]["id"] == user.id

    # Check Cache-Control: no-store
    cc = me_res.headers.get("cache-control", "")
    assert "no-store" in cc


@pytest.mark.asyncio
async def test_cookie_authenticated_post_requires_valid_csrf(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, role="owner", email="p5_csrf_test@example.com")
    await db.commit()
    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200, login_res.text
    session_token = login_res.json()["token"]
    csrf_token = login_res.json()["csrf_token"]

    client.cookies.set(settings.COOKIE_NAME, session_token)

    # 1. Mutating POST without CSRF header -> 403 Forbidden
    res_no_csrf = await client.post(
        "/api/admin/leads",
        json={"full_name": "Test Lead", "phone": "7605550199"},
        headers={"origin": "http://localhost:3000"}
    )
    assert res_no_csrf.status_code == 403
    assert "CSRF validation failed" in res_no_csrf.text

    # 2. Mutating POST with invalid CSRF header -> 403 Forbidden
    res_bad_csrf = await client.post(
        "/api/admin/leads",
        json={"full_name": "Test Lead", "phone": "7605550199"},
        headers={"x-csrf-token": "completely_bogus_token", "origin": "http://localhost:3000"}
    )
    assert res_bad_csrf.status_code == 403
    assert "CSRF validation failed" in res_bad_csrf.text

    # 3. Mutating POST with valid CSRF header -> passes CSRF check (e.g. 200/201 or 422 if lead invalid, but NOT 403)
    res_valid_csrf = await client.post(
        "/api/admin/leads",
        json={"full_name": "Test Lead", "phone": "7605550199"},
        headers={"x-csrf-token": csrf_token, "origin": "http://localhost:3000"}
    )
    assert res_valid_csrf.status_code != 403


@pytest.mark.asyncio
async def test_legacy_bearer_token_exempt_during_rollout(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, role="owner", email="p5_bearer_test@example.com")
    await db.commit()
    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200, login_res.text
    session_token = login_res.json()["token"]

    # Request with Bearer header only and NO cookie is exempt from CSRF
    client.cookies.clear()
    res = await client.post(
        "/api/admin/leads",
        json={"full_name": "Bearer Lead", "phone": "7605550188"},
        headers={"authorization": f"Bearer {session_token}", "origin": "http://localhost:3000"}
    )
    assert res.status_code != 403


@pytest.mark.asyncio
async def test_principal_separation_api_key_cannot_claim_ownership():
    # Principal with kind="api_key" and id="key:42"
    api_key_principal = Principal(
        id="key:42",
        role="service_account",
        kind="api_key",
        api_key_id=42,
        user_id=None,
        permissions={"leads.edit": "assigned"},  # scope is 'assigned', not 'all'
    )

    # Resource has user_id = 42
    resource = {"id": 100, "user_id": 42}

    # API key with ID 42 MUST NOT match user 42's resource!
    with pytest.raises(Forbidden) as exc:
        ensure_owns(api_key_principal, resource, permission="leads.edit")
    assert "API keys cannot access user-scoped records" in str(exc.value)

    # Also test check_resource_access
    api_key_user = AuthUser(
        id=42,
        name="Test API Key",
        email="key42@system.local",
        role="service_account",
        is_api_key=True,
        api_key_id=42,
        permissions={"leads.edit": "own"},
    )
    assert check_resource_access(api_key_user, "leads.edit", creator_id=42) is False


@pytest.mark.asyncio
async def test_session_management_list_and_revoke(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, role="owner", email="p5_sessions_test@example.com")
    await db.commit()
    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200, login_res.text
    session_token = login_res.json()["token"]
    csrf_token = login_res.json()["csrf_token"]
    client.cookies.set(settings.COOKIE_NAME, session_token)

    # 1. List user sessions
    res_list = await client.get("/api/admin/auth/sessions")
    assert res_list.status_code == 200, res_list.text
    sessions_data = res_list.json()
    assert sessions_data["ok"] is True
    assert len(sessions_data["sessions"]) >= 1
    session_record = sessions_data["sessions"][0]
    assert "id" in session_record
    assert "ip_address" in session_record
    assert "user_agent" in session_record
    assert session_record["is_current"] is True

    # 2. Revoke session via DELETE
    session_id = session_record["id"]
    res_revoke = await client.delete(
        f"/api/admin/auth/sessions/{session_id}",
        headers={"x-csrf-token": csrf_token}
    )
    assert res_revoke.status_code == 200
    assert res_revoke.json()["ok"] is True

    # 3. Subsequent request with revoked session fails with 401
    res_subsequent = await client.get("/api/admin/auth/me")
    assert res_subsequent.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_cookies_and_deletes_session(client: AsyncClient, db: AsyncSession):
    user = await make_user(db, role="owner", email="p5_logout_test@example.com")
    await db.commit()
    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200, login_res.text
    session_token = login_res.json()["token"]
    client.cookies.set(settings.COOKIE_NAME, session_token)

    logout_res = await client.post("/api/admin/auth/logout")
    assert logout_res.status_code == 200

    # Verify session is deleted from PostgreSQL
    row = (await db.execute(
        text("SELECT * FROM admin_sessions WHERE token = :token"),
        {"token": session_token}
    )).first()
    assert row is None


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code in (200, 503)
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers.get("permissions-policy", "")
    assert res.headers.get("x-frame-options") == "DENY"


@pytest.mark.asyncio
async def test_public_routes_registry():
    assert is_public_backend_route("/api/admin/auth/login") is True
    assert is_public_backend_route("/api/contact") is True
    assert is_public_backend_route("/health") is True
    assert is_public_backend_route("/api/admin/leads") is False
    assert is_public_backend_route("/api/admin/finances") is False
    assert is_public_backend_route("/api/admin/auth/sessions") is False
