import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException
from app.core.security import verify_password, hash_password_argon2
import bcrypt as _raw_bcrypt

class TestPhase1SecurityAndConcurrencyFixes:
    def test_bcrypt_and_argon2_dual_verification(self):
        # 1. Verify modern Argon2id hash
        pwd = "TestSecurePassword123!"
        argon_hash = hash_password_argon2(pwd)
        assert verify_password(pwd, argon_hash) is True
        assert verify_password("WrongPassword!", argon_hash) is False

        # 2. Verify Bcrypt hash ($2b$)
        bcrypt_hash = _raw_bcrypt.hashpw(pwd.encode("utf-8"), _raw_bcrypt.gensalt()).decode("utf-8")
        assert bcrypt_hash.startswith("$2b$")
        assert verify_password(pwd, bcrypt_hash) is True
        assert verify_password("WrongPassword!", bcrypt_hash) is False

    @pytest.mark.asyncio
    async def test_developer_tools_query_endpoint_is_permanently_disabled(self):
        from app.api.developer import execute_readonly_query, SqlQueryRequest
        req = SqlQueryRequest(sql="SELECT * FROM users")
        with pytest.raises(HTTPException) as exc_info:
            await execute_readonly_query(
                payload=req,
                token="dummy_token",
                db=AsyncMock()
            )
        assert exc_info.value.status_code == 403
        assert "disabled" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_contracts_autosave_rejects_already_signed_contracts(self):
        from app.api.admin.contracts import autosave_contract_draft, AutoSaveDraftRequest
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings().first.return_value = {
            "id": 101,
            "status": "client_signed",
            "client_signed_at": "2026-09-26T12:00:00",
            "contract_data": "{}"
        }
        mock_db.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await autosave_contract_draft(
                contract_id=101,
                payload=AutoSaveDraftRequest(contract_data={"total": 5000}),
                current_user=MagicMock(),
                db=mock_db
            )
        assert exc_info.value.status_code == 409
        assert "already been signed" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_cron_sweep_pipeline_endpoint_exists(self):
        from app.api.public.cron import cron_sweep_pipeline_followups
        mock_db = AsyncMock()
        mock_res = MagicMock()
        mock_res.scalars().all.return_value = []
        mock_db.execute.return_value = mock_res

        from app.core.config import settings
        res = await cron_sweep_pipeline_followups(
            request=MagicMock(),
            secret=settings.CRON_SECRET or "valid_cron_secret",
            authorization=f"Bearer {settings.CRON_SECRET}" if settings.CRON_SECRET else None,
            db=mock_db
        )
        assert res["ok"] is True
        assert res["swept_count"] == 0
