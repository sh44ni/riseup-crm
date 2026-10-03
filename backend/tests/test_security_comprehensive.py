import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException

class TestDeveloperAuthBcrypt:

    @pytest.mark.asyncio
    async def test_bcrypt_hash_verifies_correctly(self, monkeypatch):
        import bcrypt as bcrypt_lib
        real_hash = bcrypt_lib.hashpw(b"correct-pass", bcrypt_lib.gensalt(rounds=4)).decode()
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", real_hash)
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("correct-pass", "127.0.0.1")
        assert result is True

    @pytest.mark.asyncio
    async def test_wrong_bcrypt_passphrase_returns_false(self, monkeypatch):
        import bcrypt as bcrypt_lib
        real_hash = bcrypt_lib.hashpw(b"correct-pass", bcrypt_lib.gensalt(rounds=4)).decode()
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", real_hash)
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("wrong-pass", "127.0.0.1")
        assert result is False

    @pytest.mark.asyncio
    async def test_empty_passphrase_returns_false(self, monkeypatch):
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", "$2b$04$something")
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("", "127.0.0.1")
        assert result is False

    @pytest.mark.asyncio
    async def test_empty_hash_in_settings_returns_false(self, monkeypatch):
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", "")
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("any-pass", "127.0.0.1")
        assert result is False

    @pytest.mark.asyncio
    async def test_rate_limit_exceeded_raises_429(self, monkeypatch):
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", "$2b$04$x")
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(False, 0, 45))):
            from app.core.developer_auth import verify_seedphrase
            with pytest.raises(HTTPException) as exc:
                await verify_seedphrase("any-pass", "192.168.1.1")
            assert exc.value.status_code == 429
            assert "45" in exc.value.detail

    @pytest.mark.asyncio
    async def test_legacy_sha256_hash_still_verifies(self, monkeypatch):
        """SHA-256 hash (64 hex chars, no $2b$ prefix) must still verify during migration period."""
        import hashlib
        sha256_hash = hashlib.sha256(b"legacy-pass").hexdigest()
        assert len(sha256_hash) == 64 and not sha256_hash.startswith("$2b$")
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", sha256_hash)
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("legacy-pass", "127.0.0.1")
        assert result is True

    @pytest.mark.asyncio
    async def test_wrong_legacy_sha256_passphrase_returns_false(self, monkeypatch):
        import hashlib
        sha256_hash = hashlib.sha256(b"correct-pass").hexdigest()
        monkeypatch.setattr("app.core.config.settings.DEVELOPER_SEEDPHRASE_HASH", sha256_hash)
        with patch("app.core.developer_auth.check_rate_limit", new=AsyncMock(return_value=(True, 5, 60))):
            from app.core.developer_auth import verify_seedphrase
            result = await verify_seedphrase("wrong-pass", "127.0.0.1")
        assert result is False

class TestRBACPermissionMatrix:

    def _make_user(self, role, permissions, status="active", is_owner=False, is_api_key=False):
        from app.core.permissions import AuthUser
        return AuthUser(
            id=1,
            name="Test",
            email="test@test.com",
            role=role,
            status=status,
            permissions=permissions,
            is_protected_owner=is_owner,
            is_api_key=is_api_key,
            api_key_id=1 if is_api_key else None
        )

    def test_owner_wildcard_grants_all_permissions(self):
        from app.core.permissions import has_permission
        user = self._make_user("owner", {}, is_owner=True)
        assert has_permission(user, "finances.view") is True

    def test_deactivated_user_denied_all_permissions(self):
        from app.core.permissions import has_permission
        user = self._make_user("sales", {"leads.view": "all"}, status="deactivated")
        assert has_permission(user, "leads.view") is False

    def test_suspended_user_denied_all_permissions(self):
        from app.core.permissions import has_permission
        user = self._make_user("sales", {"leads.view": "all"}, status="suspended")
        # Non-active accounts must not be granted permissions
        assert has_permission(user, "leads.view") is False

    def test_api_key_user_scoped_to_its_permissions(self):
        from app.core.permissions import has_permission
        user = self._make_user("service_account", {"leads.view": "all"}, is_api_key=True)
        assert has_permission(user, "leads.view") is True
        assert has_permission(user, "finances.view") is False

    def test_has_any_permission_true_if_one_matches(self):
        from app.core.permissions import has_any_permission
        user = self._make_user("sales", {"jobs.view": "all"})
        assert has_any_permission(user, ["finances.view", "jobs.view"]) is True

    def test_has_any_permission_false_if_none_match(self):
        from app.core.permissions import has_any_permission
        user = self._make_user("sales", {"leads.view": "all"})
        assert has_any_permission(user, ["finances.view", "users.manage"]) is False

    def test_empty_permissions_dict_denies_all(self):
        from app.core.permissions import has_permission
        user = self._make_user("sales", {})
        assert has_permission(user, "leads.view") is False

    def test_active_user_with_permission_is_granted(self):
        from app.core.permissions import has_permission
        user = self._make_user("sales", {"leads.view": "all"})
        assert has_permission(user, "leads.view") is True


class TestSecurityModule:
    def test_verify_password_argon2_exception(self):
        from app.core.security import verify_password
        # Malformed argon2 hash triggers exception and returns False
        assert verify_password("pwd", "$argon2$malformed") is False

    def test_verify_password_bcrypt_exception(self):
        from app.core.security import verify_password
        # Malformed bcrypt hash triggers exception and returns False
        assert verify_password("pwd", "$2b$malformed") is False

    def test_verify_password_scrypt_fallback_false_if_no_salt(self):
        from app.core.security import verify_password
        # Without salt, fallback should return False for unknown hash format
        assert verify_password("pwd", "unknownhashformat") is False
