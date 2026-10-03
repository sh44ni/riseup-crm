"""Unit tests for WP-3.1 Shared Kernel components.

Covers:
- core/errors.py (DomainError taxonomy)
- core/authz.py (Principal, scope resolution, ensure_owns)
- core/uow.py (UnitOfWork, begin_nested)
- shared/activity.py (tamper-proof activity logging)
- shared/partial_update.py (safe parameterised updates)
- shared/numbering.py (atomic PostgreSQL sequences)
- shared/pagination.py (Page, PageParams)
- shared/money.py (strict Decimal rounding & serialization)
- core/logging.py (structured logging & request context)
"""
from decimal import Decimal
import pytest
from pydantic import BaseModel
from sqlalchemy import text

from app.core.authz import Principal, ensure_owns
from app.core.errors import (
    Conflict,
    DomainError,
    ExternalServiceError,
    Forbidden,
    NotFound,
    Unauthenticated,
    ValidationFailed,
)
from app.core.logging import get_logger, request_id_ctx, user_id_ctx
from app.core.uow import UnitOfWork
from app.shared.activity import log_activity
from app.shared.money import Money, format_currency, quantize_money
from app.shared.numbering import next_document_number
from app.shared.pagination import Page, PageParams
from app.shared.partial_update import build_update


# ── 1. Error Taxonomy ─────────────────────────────────────────────────────────
def test_domain_error_hierarchy_and_serialization():
    err = NotFound("Lead #99 not found", details={"id": 99})
    assert err.status_code == 404
    assert err.code == "NOT_FOUND"

    serialized = err.to_dict(request_id="req-test-123")
    assert serialized["ok"] is False
    assert serialized["detail"] == "Lead #99 not found"
    assert serialized["requestId"] == "req-test-123"
    assert serialized["error"]["code"] == "NOT_FOUND"
    assert serialized["error"]["details"] == {"id": 99}

    assert Forbidden("No access").status_code == 403
    assert Conflict("Record already exists").status_code == 409
    assert ValidationFailed("Field required").status_code == 422
    assert Unauthenticated("Token expired").status_code == 401
    assert ExternalServiceError("Weather API down").status_code == 502
    assert DomainError("Generic domain error").status_code == 400


# ── 2. Authorization & Principal ──────────────────────────────────────────────
def test_principal_scope_and_permissions():
    owner = Principal(id=1, role="owner", name="Marc Owner")
    assert owner.scope_for("leads.view") == "all"
    assert owner.has_permission("contracts.delete") is True

    rep = Principal(
        id=2,
        role="sales_rep",
        name="Rep Alice",
        permissions={"leads.view": "own", "estimates.create": "assigned", "contracts.*": "all"},
    )
    assert rep.scope_for("leads.view") == "own"
    assert rep.has_permission("leads.view", required_scope="own") is True
    assert rep.has_permission("leads.view", required_scope="all") is False

    # Wildcard permission check
    assert rep.scope_for("contracts.view") == "all"
    assert rep.scope_for("finances.view") == "none"
    assert rep.has_permission("finances.view") is False


def test_ensure_owns_validation():
    owner = Principal(id=1, role="owner")
    rep_1 = Principal(id=10, role="sales_rep", permissions={"leads.edit": "own", "estimates.edit": "own"})
    rep_2 = Principal(id=20, role="sales_rep", permissions={"leads.edit": "own", "estimates.edit": "own"})

    # Owner always bypasses ownership check
    lead_foreign = {"id": 100, "assigned_to": 20}
    ensure_owns(owner, lead_foreign, "leads.edit")

    # Rep 2 owns the lead
    ensure_owns(rep_2, lead_foreign, "leads.edit")

    # Rep 1 does not own the lead -> Forbidden
    with pytest.raises(Forbidden, match="permission"):
        ensure_owns(rep_1, lead_foreign, "leads.edit")

    # Associated lead check on child object (e.g. Estimate)
    est_foreign = {"id": 500, "lead": {"assigned_to": 20}}
    ensure_owns(rep_2, est_foreign, "estimates.edit")
    with pytest.raises(Forbidden):
        ensure_owns(rep_1, est_foreign, "estimates.edit")


# ── 3. Partial Update Builder ─────────────────────────────────────────────────
def test_build_update_sanitization_and_clauses():
    allowed = ["customer_name", "status", "roof_squares", "updated_at"]
    changes = {
        "customer_name": "Updated Name",
        "status": "in_progress",
        "malicious_col": "hacked",  # Not in allowed list
    }

    stmt, params = build_update("leads", allowed, changes, where_clause="id = :id", where_params={"id": 42})
    assert stmt is not None
    sql_str = str(stmt)
    assert "UPDATE leads SET" in sql_str
    assert "customer_name = :val_customer_name" in sql_str
    assert "status = :val_status" in sql_str
    assert "malicious_col" not in sql_str
    assert "updated_at = NOW()" in sql_str
    assert "WHERE id = :id" in sql_str
    assert params["id"] == 42
    assert params["val_customer_name"] == "Updated Name"

    # Refuse invalid table names
    with pytest.raises(ValueError):
        build_update("leads; DROP TABLE users;--", allowed, changes)


# ── 4. Money Helpers & Pydantic Type ──────────────────────────────────────────
class ProductPricing(BaseModel):
    unit_cost: Money
    total_price: Money


def test_money_calculations_and_serialization():
    assert quantize_money(125.456) == Decimal("125.46")
    assert quantize_money("99.999") == Decimal("100.00")
    assert format_currency(Decimal("1234567.89")) == "$1,234,567.89"

    model = ProductPricing(unit_cost=15.509, total_price=Decimal("150.2"))
    assert model.unit_cost == Decimal("15.51")
    assert model.total_price == Decimal("150.20")

    json_dump = model.model_dump(mode="json")
    assert json_dump["unit_cost"] == 15.51
    assert json_dump["total_price"] == 150.2


# ── 5. Pagination Primitives ──────────────────────────────────────────────────
def test_pagination_page_and_params():
    params = PageParams(limit=150, offset=10)
    assert params.limit == 100  # Clamped to 100 max

    items = ["item1", "item2", "item3"]
    page = Page.create(items=items, limit=2, offset=0, total=5)
    assert page.items == items
    assert page.limit == 2
    assert page.total == 5
    assert page.has_more is True


# ── 6. Unit of Work & Savepoint Nested Transactions ───────────────────────────
@pytest.mark.asyncio
async def test_unit_of_work_lifecycle(db):
    uow = UnitOfWork(db)
    async with uow.begin_nested() as sp:
        res = await uow.session.execute(text("SELECT 1 AS num"))
        assert res.scalar() == 1
    # Savepoint committed cleanly without session error


# ── 7. Tamper-Proof Activity Logging ──────────────────────────────────────────
@pytest.mark.asyncio
async def test_tamper_proof_log_activity(db):
    uow = UnitOfWork(db)
    actor = Principal(id=1, role="sales_rep", name="Real Staff")

    row = await log_activity(
        uow=uow,
        entity_type="lead",
        entity_id=9999,
        action="note_added",
        actor=actor,
        title="Valid Note",
        description="Tamper proof log description",
    )
    assert row["user_id"] == 1
    assert row["user_name"] == "Real Staff"
    assert "Real Staff (Sales Rep)" in row["performed_by"]
    assert row["activity_type"] == "note_added"


# ── 8. Sequential Number Generation ───────────────────────────────────────────
@pytest.mark.asyncio
async def test_next_document_number_sequences(db):
    uow = UnitOfWork(db)
    num1 = await next_document_number(uow, "estimate")
    num2 = await next_document_number(uow, "estimate")
    job_num = await next_document_number(uow, "job")

    assert num1.startswith("EST-")
    assert num2.startswith("EST-")
    assert job_num.startswith("JOB-")
    assert num1 != num2

    # Sequential increment
    seq1 = int(num1.split("-")[-1])
    seq2 = int(num2.split("-")[-1])
    assert seq2 == seq1 + 1


# ── 9. Logging Context ────────────────────────────────────────────────────────
def test_logging_context_propagation():
    logger = get_logger("test_shared_kernel")
    token = request_id_ctx.set("trace-abc-123")
    user_token = user_id_ctx.set(42)

    assert request_id_ctx.get() == "trace-abc-123"
    request_id_ctx.reset(token)
    user_id_ctx.reset(user_token)


# ── 10. UOW Scope & Rollback ──────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_uow_scope_commit_and_rollback(db):
    from app.core.uow import uow_scope
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
    factory = async_sessionmaker(db.bind, class_=AsyncSession, expire_on_commit=False)
    async with uow_scope(session_factory=factory) as uow:
        res = await uow.session.execute(text("SELECT 100"))
        assert res.scalar() == 100

    with pytest.raises(RuntimeError):
        async with uow_scope(session_factory=factory) as uow:
            await uow.session.execute(text("SELECT 200"))
            raise RuntimeError("Forced rollback")


# ── 11. System Activity Logging ───────────────────────────────────────────────
@pytest.mark.asyncio
async def test_system_actor_log_activity(db):
    uow = UnitOfWork(db)
    row = await log_activity(
        uow=uow,
        entity_type="system",
        entity_id=0,
        action="cron_maintenance",
        actor=None,
    )
    assert row["user_id"] is None
    assert row["user_name"] == "System"
    assert row["performed_by"] == "System Automation"


# ── 12. Build Update Edge Cases ───────────────────────────────────────────────
def test_build_update_empty_and_no_match():
    stmt, params = build_update("leads", ["status"], {"non_existent": 123})
    assert stmt is None
    assert params == {}

    stmt2, params2 = build_update("leads", ["status"], {}, include_updated_at=False)
    assert stmt2 is None
    assert params2 == {}


# ── 13. Money Edge Cases ──────────────────────────────────────────────────────
def test_money_edge_cases():
    assert quantize_money(None) == Decimal("0.00")
    with pytest.raises(ValueError, match="Invalid monetary amount"):
        quantize_money("not-a-number")


# ── 14. Logging Setup & JSON Renderer ─────────────────────────────────────────
def test_logging_setup_and_json():
    from app.core.logging import setup_logging
    setup_logging("DEBUG", json_format=True)
    logger = get_logger("test_json")
    logger.info("JSON log message test")
    # Restore standard logging
    setup_logging("INFO", json_format=False)

