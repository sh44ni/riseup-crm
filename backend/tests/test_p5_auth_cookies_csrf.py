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
    assert is_public_backend_route("/api/admin/auth/verify-otp") is True
    assert is_public_backend_route("/api/admin/auth/resend-otp") is True
    assert is_public_backend_route("/api/contact") is True
    assert is_public_backend_route("/health") is True
    assert is_public_backend_route("/api/admin/leads") is False
    assert is_public_backend_route("/api/admin/finances") is False
    assert is_public_backend_route("/api/admin/auth/sessions") is False


@pytest.mark.asyncio
async def test_login_pending_invite_requires_otp_and_verifies(client: AsyncClient, db: AsyncSession):
    import json
    from app.core.redis import cache_get
    test_email = "test_otp_user@example.com"
    test_token = "test_invite_token_1234567890"

    # Insert pending invitation
    await db.execute(text("""
        INSERT INTO invitations (email, invited_role_ids, token, status, expires_at, created_at)
        VALUES (:email, ARRAY[4]::integer[], :token, 'pending', NOW() + INTERVAL '7 days', NOW())
        ON CONFLICT (token) DO NOTHING
    """), {"email": test_email, "token": test_token})
    await db.commit()

    # 1. First-time login attempt with wrong password triggers OTP
    res = await client.post("/api/admin/auth/login", json={"email": test_email, "password": "wrongpassword!"})
    assert res.status_code == 403
    data = res.json()
    assert data["detail"]["code"] == "OTP_REQUIRED"
    assert data["detail"]["email"] == test_email

    # Verify OTP was written to cache
    cached_val = await cache_get(f"otp:invite:{test_email}")
    assert cached_val is not None
    otp_obj = json.loads(cached_val)
    valid_otp = otp_obj["otp"]

    # 2. Verify with wrong OTP fails
    bad_verify = await client.post("/api/admin/auth/verify-otp", json={"email": test_email, "otp": "999999" if valid_otp != "999999" else "111111"})
    assert bad_verify.status_code == 400

    # 3. Verify with correct OTP succeeds and returns invite token
    good_verify = await client.post("/api/admin/auth/verify-otp", json={"email": test_email, "otp": valid_otp})
    assert good_verify.status_code == 200
    assert good_verify.json()["ok"] is True
    assert good_verify.json()["token"] == test_token

    # 4. Clean up
    await db.execute(text("DELETE FROM invitations WHERE email = :email"), {"email": test_email})
    await db.commit()


@pytest.mark.asyncio
async def test_owner_is_authorized_signatory_and_can_set_signature(client: AsyncClient, db: AsyncSession):
    owner = await make_user(db, role="owner", email="owner_sig_test@example.com")
    await db.commit()

    # Log in as owner
    login_res = await client.post("/api/admin/auth/login", json={"email": owner.email, "password": "TestPassword123!"})
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["is_authorized_signatory"] is True

    session_token = login_data["token"]
    csrf_token = login_data["csrf_token"]
    headers = {"Authorization": f"Bearer {session_token}", "X-CSRF-Token": csrf_token}

    # Verify owner appears in signatories list
    sig_list_res = await client.get("/api/admin/signatories", headers=headers)
    assert sig_list_res.status_code == 200
    sigs = sig_list_res.json()["signatories"]
    owner_sig = next((s for s in sigs if s["id"] == owner.id), None)
    assert owner_sig is not None
    assert owner_sig["is_self"] is True

    # Configure signature for owner
    set_sig_res = await client.put(
        f"/api/admin/signatories/{owner.id}/signature",
        headers=headers,
        json={
            "signature_name": "Test Owner",
            "signature_title": "Executive Owner",
            "signature_type": "typed",
            "signature_data": "Test Owner Signature"
        }
    )
    assert set_sig_res.status_code == 200
    assert set_sig_res.json()["ok"] is True
    assert set_sig_res.json()["signatory"]["signature_data"] == "Test Owner Signature"


@pytest.mark.asyncio
async def test_administrator_role_protected_and_owner_can_manage(client: AsyncClient, db: AsyncSession):
    # Setup: Ensure Administrator role exists and is protected
    admin_role = (await db.execute(text("SELECT id, name, is_protected FROM roles WHERE name = 'Administrator'"))).mappings().first()
    assert admin_role is not None
    assert admin_role["is_protected"] is True

    owner_role = (await db.execute(text("SELECT id, name, is_protected FROM roles WHERE name = 'Owner'"))).mappings().first()
    assert owner_role is not None

    # Create Owner user
    owner = await make_user(db, role="owner", email="owner_rbac_test@example.com")
    # Create two Admin users
    admin1 = await make_user(db, role="admin", email="admin1_rbac_test@example.com")
    admin2 = await make_user(db, role="admin", email="admin2_rbac_test@example.com")
    await db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r) ON CONFLICT DO NOTHING"), {"u": admin1.id, "r": admin_role["id"]})
    await db.execute(text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r) ON CONFLICT DO NOTHING"), {"u": admin2.id, "r": admin_role["id"]})
    await db.commit()

    # 1. Login as Admin 1
    admin_login = await client.post("/api/admin/auth/login", json={"email": admin1.email, "password": "TestPassword123!"})
    assert admin_login.status_code == 200
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['token']}", "X-CSRF-Token": admin_login.json()["csrf_token"]}

    # Admin 1 attempts to delete Administrator role -> 403 Forbidden
    del_admin_res = await client.delete(f"/api/admin/roles/{admin_role['id']}", headers=admin_headers)
    assert del_admin_res.status_code == 403

    # Admin 1 attempts to delete Owner role -> 403 Forbidden
    del_owner_res = await client.delete(f"/api/admin/roles/{owner_role['id']}", headers=admin_headers)
    assert del_owner_res.status_code == 403

    # Admin 1 attempts to modify Administrator role permissions -> 403 Forbidden
    edit_admin_role_res = await client.put(
        f"/api/admin/roles/{admin_role['id']}",
        headers=admin_headers,
        json={"modules": {"leads": {"view": "own", "manage": False}}}
    )
    assert edit_admin_role_res.status_code == 403

    # Admin 1 attempts to change Admin 2's role or status -> 403 Forbidden
    edit_admin2_res = await client.put(
        f"/api/admin/users/{admin2.id}",
        headers=admin_headers,
        json={"status": "suspended"}
    )
    assert edit_admin2_res.status_code == 403

    # 2. Login as Owner
    owner_login = await client.post("/api/admin/auth/login", json={"email": owner.email, "password": "TestPassword123!"})
    assert owner_login.status_code == 200
    owner_headers = {"Authorization": f"Bearer {owner_login.json()['token']}", "X-CSRF-Token": owner_login.json()["csrf_token"]}

    # Owner attempts to modify Administrator role permissions -> 200 OK!
    owner_edit_res = await client.put(
        f"/api/admin/roles/{admin_role['id']}",
        headers=owner_headers,
        json={"modules": {"leads": {"view": "all", "manage": True}}}
    )
    assert owner_edit_res.status_code == 200
    assert owner_edit_res.json()["ok"] is True

    # Owner attempts to change Admin 2's status -> 200 OK!
    owner_edit_admin2_res = await client.put(
        f"/api/admin/users/{admin2.id}",
        headers=owner_headers,
        json={"status": "suspended"}
    )
    assert owner_edit_admin2_res.status_code == 200
    assert owner_edit_admin2_res.json()["ok"] is True


@pytest.mark.asyncio
async def test_invitation_accept_requires_otp_verification(client: AsyncClient, db: AsyncSession):
    import json
    from app.core.redis import cache_get
    test_email = "secure_invitee@example.com"
    test_token = "secure_token_abc_123456789"

    # Insert pending invitation
    await db.execute(text("""
        INSERT INTO invitations (email, invited_role_ids, token, status, expires_at, created_at)
        VALUES (:email, ARRAY[4]::integer[], :token, 'pending', NOW() + INTERVAL '7 days', NOW())
        ON CONFLICT (token) DO NOTHING
    """), {"email": test_email, "token": test_token})
    await db.commit()

    # 1. Direct accept attempt without OTP fails with 403 Forbidden
    unverified_accept = await client.post(
        f"/api/public/invitations/{test_token}/accept",
        json={"name": "Secure Invitee", "password": "SecurePassword123!"}
    )
    assert unverified_accept.status_code == 403
    assert unverified_accept.json()["detail"]["code"] == "OTP_VERIFICATION_REQUIRED"

    # 2. GET invitation details shows verified = false
    details_res = await client.get(f"/api/public/invitations/{test_token}")
    assert details_res.status_code == 200
    assert details_res.json()["verified"] is False
    assert details_res.json()["invitation"]["email"] == test_email

    # 3. Trigger OTP dispatch via resend-otp
    resend_res = await client.post("/api/admin/auth/resend-otp", json={"email": test_email})
    assert resend_res.status_code == 200

    # Read OTP from cache
    cached_val = await cache_get(f"otp:invite:{test_email}")
    assert cached_val is not None
    otp_code = json.loads(cached_val)["otp"]

    # 4. Verify OTP
    verify_res = await client.post("/api/admin/auth/verify-otp", json={"email": test_email, "otp": otp_code})
    assert verify_res.status_code == 200

    # 5. GET invitation details now shows verified = true
    details_res_after = await client.get(f"/api/public/invitations/{test_token}")
    assert details_res_after.status_code == 200
    assert details_res_after.json()["verified"] is True

    # 6. Now accept succeeds and activates account
    verified_accept = await client.post(
        f"/api/public/invitations/{test_token}/accept",
        json={"name": "Secure Invitee", "password": "SecurePassword123!"}
    )
    assert verified_accept.status_code == 200
    assert verified_accept.json()["ok"] is True
    assert verified_accept.json()["user"]["email"] == test_email

    # Clean up created user and invitation
    await db.execute(text("DELETE FROM users WHERE email = :email"), {"email": test_email})
    await db.execute(text("DELETE FROM invitations WHERE email = :email"), {"email": test_email})
    await db.commit()

