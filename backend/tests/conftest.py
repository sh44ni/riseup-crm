"""
Pytest configuration and test harness fixtures.
Provides:
  - Function-scoped transactional isolation using savepoint rollback on NullPool
  - Redis fixture (DB 15 flush / fakeredis fallback)
  - Async HTTP client via ASGITransport
  - External service mocking (email, Turnstile, PDF generator)
  - Predefined user roles and session auth headers
  - Backward-compatible unit test fixtures
"""
import asyncio
import os
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncConnection
from sqlalchemy.pool import NullPool
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.main import app
from tests.factories import make_user, login_as


# ── Database Fixtures ─────────────────────────────────────────────────────────

def _get_test_database_url() -> str:
    url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL") or settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture(scope="session", autouse=True)
def setup_sequences():
    async def _init():
        engine = create_async_engine(_get_test_database_url(), poolclass=NullPool)
        async with engine.connect() as conn:
            for seq in ["estimate_number_seq", "job_number_seq", "contract_number_seq", "invoice_number_seq"]:
                await conn.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq}"))
            for ddl in [
                "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS id BIGSERIAL",
                "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT",
                "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT",
                "ALTER TABLE admin_sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW()",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_type VARCHAR(32) DEFAULT 'user'",
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(64)",
                "ALTER TABLE activities ADD COLUMN IF NOT EXISTS actor_type VARCHAR(32) DEFAULT 'user'",
                "ALTER TABLE activities ADD COLUMN IF NOT EXISTS actor_id VARCHAR(64)",
            ]:
                await conn.execute(text(ddl))
            await conn.commit()
        await engine.dispose()
    asyncio.run(_init())


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped session with outer transaction and savepoint rollback using NullPool.
    Guarantees no connections leak across event loops on Windows or CI,
    and tests never leave persistent data behind.
    Overrides FastAPI's get_db dependency.
    """
    engine = create_async_engine(
        _get_test_database_url(),
        poolclass=NullPool,
    )
    conn: AsyncConnection = await engine.connect()
    trans = await conn.begin()

    session = AsyncSession(
        bind=conn,
        join_transaction_mode="create_savepoint",
        expire_on_commit=False,
    )

    db_mutex = asyncio.Lock()

    async def _override_get_db():
        async with db_mutex:
            req_session = AsyncSession(
                bind=conn,
                join_transaction_mode="create_savepoint",
                expire_on_commit=False,
            )
            try:
                yield req_session
                if req_session.is_active:
                    await req_session.commit()
            except Exception:
                if req_session.is_active:
                    await req_session.rollback()
                raise
            finally:
                await req_session.close()

    app.dependency_overrides[get_db] = _override_get_db

    try:
        yield session
    finally:
        app.dependency_overrides.pop(get_db, None)
        await session.close()
        if trans.is_active:
            await trans.rollback()
        await conn.close()
        await engine.dispose()


# ── Redis Fixture ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def redis_client():
    """
    Provides isolated Redis client (DB index 15) or fakeredis fallback.
    Flushes DB 15 upon teardown.
    """
    import redis.asyncio as aioredis
    try:
        r = aioredis.from_url("redis://localhost:6379/15")
        await r.ping()
        await r.flushdb()
        yield r
        await r.flushdb()
        await r.aclose()
    except Exception:
        import fakeredis.aioredis as fake
        f = fake.FakeRedis()
        yield f
        await f.flushdb()


# ── HTTP Client Fixture ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db) -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    Async HTTP client bound to the FastAPI app via ASGITransport.
    Exercises full middleware and routing stack.
    """
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ── External Service Stubs ───────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def stub_external_services():
    """
    Autouse fixture that stubs out third-party network services:
    Resend/email, Turnstile, and Playwright PDF generation.
    """
    with patch("app.services.email_service.send_contract_email", new=AsyncMock(return_value={"success": True, "id": "mock_email"})), \
         patch("app.api.admin.contracts.send_contract_email", new=AsyncMock(return_value={"success": True, "id": "mock_email"})), \
         patch("app.services.email_service.send_estimate_proposal_email", new=AsyncMock(return_value={"success": True, "id": "mock_email"})), \
         patch("app.services.pdf_generator.generate_estimate_proposal_pdf", new=AsyncMock(return_value=b"%PDF-1.4 Mock PDF Document")), \
         patch("app.services.pdf_generator._sync_generate_pdf_worker", return_value=b"%PDF-1.4 Mock PDF Document"), \
         patch("app.services.contract_pdf_generator._sync_generate_contract_pdf_worker", return_value=b"%PDF-1.4 Mock Contract PDF"), \
         patch("app.services.turnstile.verify_turnstile_token", new=AsyncMock(return_value=True)):
        yield


# ── Roles and Auth Fixtures ──────────────────────────────────────────────────

@pytest_asyncio.fixture
async def user_owner(db: AsyncSession):
    return await make_user(db, role="owner", name="Test Owner", email="owner@test.local")


@pytest_asyncio.fixture
async def user_admin(db: AsyncSession):
    return await make_user(db, role="admin", name="Test Admin", email="admin@test.local")


@pytest_asyncio.fixture
async def user_sales_rep(db: AsyncSession):
    return await make_user(db, role="sales_rep", name="Test Sales Rep", email="salesrep@test.local")


@pytest_asyncio.fixture
async def user_estimator(db: AsyncSession):
    return await make_user(db, role="estimator", name="Test Estimator", email="estimator@test.local")


@pytest_asyncio.fixture
async def user_viewer(db: AsyncSession):
    return await make_user(db, role="viewer", name="Test Viewer", email="viewer@test.local")


@pytest_asyncio.fixture
async def user_no_permissions(db: AsyncSession):
    return await make_user(db, role="guest", name="Test Guest", email="guest@test.local", permissions=[])


@pytest_asyncio.fixture
async def auth_owner(user_owner, db: AsyncSession) -> Dict[str, str]:
    return await login_as(user_owner, db)


@pytest_asyncio.fixture
async def auth_admin(user_admin, db: AsyncSession) -> Dict[str, str]:
    return await login_as(user_admin, db)


@pytest_asyncio.fixture
async def auth_sales_rep(user_sales_rep, db: AsyncSession) -> Dict[str, str]:
    return await login_as(user_sales_rep, db)


@pytest_asyncio.fixture
async def auth_estimator(user_estimator, db: AsyncSession) -> Dict[str, str]:
    return await login_as(user_estimator, db)


@pytest_asyncio.fixture
async def auth_viewer(user_viewer, db: AsyncSession) -> Dict[str, str]:
    return await login_as(user_viewer, db)


# ── Backward-Compatible Fixtures for Existing Unit Tests ──────────────────────

@pytest.fixture
def mock_db():
    """Async SQLAlchemy session mock that mimics the real session interface."""
    m = AsyncMock()
    m.execute = AsyncMock()
    m.commit = AsyncMock()
    m.rollback = AsyncMock()
    m.close = AsyncMock()
    m.is_active = True
    return m


@pytest.fixture
def mock_user_owner():
    """Default active owner user with wildcard permissions."""
    try:
        from app.core.permissions import AuthUser
        return AuthUser(
            id=1,
            name="Test Owner",
            email="owner@test.local",
            role="owner",
            status="active",
            permissions={"*": "all"},
            is_protected_owner=True,
        )
    except Exception:
        return MagicMock(id=1, name="Test Owner", role="owner", status="active")


@pytest.fixture
def mock_user_sales_rep():
    """Active sales rep with limited permissions."""
    try:
        from app.core.permissions import AuthUser
        return AuthUser(
            id=2,
            name="Test Sales Rep",
            email="salesrep@test.local",
            role="sales_rep",
            status="active",
            permissions={"leads.view": "own", "leads.create": "all"},
            is_protected_owner=False,
        )
    except Exception:
        return MagicMock(id=2, name="Test Sales Rep", role="sales_rep", status="active")


@pytest.fixture
def mock_redis_unavailable():
    """Mock Redis as unavailable — forces in-memory fallback."""
    with patch("app.core.redis.is_redis_available", new=AsyncMock(return_value=False)):
        yield


@pytest.fixture
def mock_redis_available():
    """Mock Redis as available."""
    with patch("app.core.redis.is_redis_available", new=AsyncMock(return_value=True)):
        yield


@pytest.fixture
def sample_lead_data():
    """A realistic lead payload for testing lead-related code."""
    return {
        "name": "John Homeowner",
        "email": "john@example.com",
        "phone": "760-555-1234",
        "address": "123 Roof Street",
        "city": "Escondido",
        "zip": "92025",
        "serviceType": "residential tile",
        "roofSqf": 2500,
        "source": "website",
        "leadSource": "Google Ads",
    }


@pytest.fixture
def sample_estimate_data():
    """A realistic estimate payload."""
    return {
        "client": {"leadId": 42, "name": "John Homeowner"},
        "photo1": "https://example.com/photo.jpg",
        "proposalDate": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "plans": [
            {
                "name": "Plan A — Tile Relay",
                "subtitle": "Reuse Existing Tiles",
                "price": 26870,
                "scopeItems": [
                    "Remove and stage existing tiles",
                    "Remove old underlayment",
                    "Install new underlayment",
                    "Install new flashings",
                    "Reinstall tiles",
                ],
                "warrantyChips": ["10 YEAR WORKMANSHIP"],
            }
        ],
        "pricing": {"lockInDays": 20},
    }
