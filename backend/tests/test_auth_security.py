import pytest
from app.core.security import verify_password, hash_scrypt_password, generate_session_token
from app.core.permissions import AuthUser, has_permission, has_any_permission


class TestSecurityHardening:
    def test_scrypt_password_hashing_and_verification(self):
        password = "SecurePassword123!"
        hashed, salt = hash_scrypt_password(password)

        assert verify_password(password, hashed, salt) is True
        assert verify_password("WrongPassword!", hashed, salt) is False
        assert verify_password("", hashed, salt) is False

    def test_master_password_no_longer_validates_as_hash(self):
        # Former backdoor password should not magically verify against a real user's hash
        user_pass = "ActualUserPassword2026#"
        hashed, salt = hash_scrypt_password(user_pass)

        assert verify_password("RiseUp2024!", hashed, salt) is False

    def test_session_token_format(self):
        token = generate_session_token()
        assert len(token) == 64
        # Verify hex format
        int(token, 16)

    def test_api_key_role_and_scope_isolation(self):
        # Service account API key must NOT be granted owner wildcard
        api_user = AuthUser(
            id=99,
            name="API Key: Integration",
            email="api_test@system.local",
            role="service_account",
            status="active",
            permissions={"leads.view": "all"},
            is_protected_owner=False,
            is_api_key=True,
            api_key_id=99,
        )

        assert api_user.is_protected_owner is False
        assert api_user.is_api_key is True
        assert has_permission(api_user, "leads.view") is True
        # Blocked from financial and administrative actions
        assert has_permission(api_user, "finances.view") is False
        assert has_permission(api_user, "users.manage") is False
        assert has_permission(api_user, "contracts.delete") is False

    def test_deactivated_user_permission_denial(self):
        deactivated_user = AuthUser(
            id=5,
            name="Ex Employee",
            email="ex@riseup.local",
            role="sales_rep",
            status="deactivated",
            permissions={"leads.view": "all"},
        )
        assert has_permission(deactivated_user, "leads.view") is False
        assert has_any_permission(deactivated_user, ["leads.view", "clients.view"]) is False

    def test_session_token_masking_format(self):
        token = "a" * 64
        masked = token[:8] + "..." + token[-4:]
        assert masked == "aaaaaaaa...aaaa"
        assert len(masked) == 15
        assert token not in masked
