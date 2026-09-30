"""
Shared pytest fixtures for all test modules.
These are automatically discovered by pytest — no import needed in test files.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone


@pytest.fixture
def mock_db():
    """Async SQLAlchemy session mock that mimics the real session interface."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    db.is_active = True
    return db


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
