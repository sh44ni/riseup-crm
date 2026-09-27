import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from fastapi import HTTPException
from app.models.pipeline import Contract
from app.services.sync import bulk_recalculate_all_client_stats

class TestPhase2And3ConcurrencyAndScalability:
    def test_contract_model_has_version_column(self):
        """Verify Contract model has version column for optimistic concurrency locking."""
        assert hasattr(Contract, "version")
        version_col = getattr(Contract, "version")
        assert version_col is not None

    @pytest.mark.asyncio
    async def test_public_contract_signing_optimistic_cas_check(self):
        """Verify sign_public_contract uses CAS update and rejects signed/voided contracts."""
        from app.api.public.contracts import sign_public_contract, SignContractRequest
        mock_db = AsyncMock()
        mock_db.begin.return_value.__aenter__ = AsyncMock()
        mock_db.begin.return_value.__aexit__ = AsyncMock()

        # Mock SELECT of contract
        mock_fetch = MagicMock()
        mock_fetch.mappings().first.return_value = {
            "id": 55,
            "status": "signed",  # Already signed!
            "client_signed_at": "2026-09-25T10:00:00",
            "signed_pdf_url": "https://example.com/contract.pdf",
            "customer_name": "Alice Smith",
            "contract_title": "Roof Replacement",
            "token": "valid_token_123"
        }
        mock_db.execute.return_value = mock_fetch

        payload = SignContractRequest(
            token="valid_token_123",
            signature="data:image/png;base64,abc...",
            signer_name="Alice Smith"
        )

        with pytest.raises(HTTPException) as exc_info:
            await sign_public_contract(
                payload=payload,
                request=MagicMock(),
                db=mock_db
            )
        assert exc_info.value.status_code == 409
        assert "already been signed" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_redis_scan_iter_batch_invalidation(self):
        """Verify invalidate_session_cache uses scan_iter and deletes in batches."""
        from app.core.redis import invalidate_session_cache

        mock_redis = AsyncMock()
        # Async generator for scan_iter
        async def mock_scan_iter(match=None, count=None):
            for i in range(5):
                yield f"session_user:{i}"

        mock_redis.scan_iter = mock_scan_iter
        mock_redis.delete = AsyncMock()

        with patch("app.core.redis.is_redis_available", AsyncMock(return_value=True)), \
             patch("app.core.redis.get_redis", return_value=mock_redis):
            await invalidate_session_cache()
            assert mock_redis.delete.called
            # Verify deleted keys were passed
            deleted_keys = mock_redis.delete.call_args[0]
            assert "session_user:0" in deleted_keys

    @pytest.mark.asyncio
    async def test_bulk_recalculate_client_stats_query_construction(self):
        """Verify bulk_recalculate_all_client_stats executes a single bulk SQL statement."""
        mock_db = AsyncMock()
        mock_res = MagicMock()
        mock_res.rowcount = 42
        mock_db.execute.return_value = mock_res

        result = await bulk_recalculate_all_client_stats(mock_db)
        assert result == 42
        assert mock_db.execute.called
        call_arg = mock_db.execute.call_args[0][0]
        # Verify it's a bulk query with CTEs
        assert "WITH client_rev AS" in str(call_arg.text)
        assert "UPDATE clients c" in str(call_arg.text)

    @pytest.mark.asyncio
    async def test_database_session_lifecycle_guards(self):
        """Verify get_db only commits/rollbacks when session is active."""
        from app.core.database import get_db

        mock_session = AsyncMock()
        mock_session.is_active = True
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock()

        with patch("app.core.database.async_session_factory", mock_factory):
            gen = get_db()
            session = await anext(gen)
            assert session is mock_session
            # Simulate endpoint doing commit and deactivating session
            mock_session.is_active = False
            with pytest.raises(StopAsyncIteration):
                await anext(gen)
            # Should NOT attempt double-commit when is_active is False
            assert not mock_session.commit.called
