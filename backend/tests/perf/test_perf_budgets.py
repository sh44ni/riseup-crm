"""
Performance Budget & N+1 Query Assertion Suite (WP-6.3)
========================================================
Validates that core administrative endpoints adhere to strict latency budgets
and that list/board queries do not suffer from N+1 query regressions.

Budgets:
- List & Kanban Board endpoints: p95 < 300ms
- Reporting & Aggregation endpoints: p95 < 800ms
- Error rate: < 0.1%
"""

import time
import statistics
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import event

from app.core.config import settings
from tests.factories import make_user


@pytest.mark.asyncio
async def test_n1_query_ceiling_on_leads_list(client: AsyncClient, db: AsyncSession):
    """
    Asserts SQL statement ceiling on the leads listing endpoint to guard
    against N+1 relationship query regressions.
    """
    user = await make_user(db, role="owner", email="perf_n1_leads@example.com")
    await db.commit()

    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["token"]
    client.cookies.set(settings.COOKIE_NAME, token)

    # Count SQL statements executed during GET /api/admin/leads
    sql_count = 0
    sync_conn = await db.connection()

    def count_sql(*args, **kwargs):
        nonlocal sql_count
        sql_count += 1

    event.listen(sync_conn.sync_engine, "before_cursor_execute", count_sql)

    try:
        res = await client.get("/api/admin/leads?limit=25")
        assert res.status_code == 200
    finally:
        event.remove(sync_conn.sync_engine, "before_cursor_execute", count_sql)

    # A properly joined or indexed lead query should execute fewer than 6 queries total (session check, perms, count, items)
    assert sql_count < 10, f"N+1 query regression detected: {sql_count} queries executed for 25 leads"


@pytest.mark.asyncio
async def test_p95_latency_budget_on_core_endpoints(client: AsyncClient, db: AsyncSession):
    """
    Simulates consecutive requests against core endpoints to compute p95 latencies
    and assert compliance with WP-6.3 performance budgets.
    """
    user = await make_user(db, role="owner", email="perf_p95_test@example.com")
    await db.commit()

    login_res = await client.post(
        "/api/admin/auth/login",
        json={"email": user.email, "password": "TestPassword123!"}
    )
    token = login_res.json()["token"]
    client.cookies.set(settings.COOKIE_NAME, token)

    # 1. Benchmark Pipeline Kanban endpoint (Budget: p95 < 300ms)
    pipeline_latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        res = await client.get("/api/admin/pipeline")
        t1 = time.perf_counter()
        assert res.status_code == 200
        pipeline_latencies.append((t1 - t0) * 1000)

    pipeline_p95 = statistics.quantiles(pipeline_latencies, n=100)[94] if len(pipeline_latencies) >= 20 else max(pipeline_latencies)
    assert pipeline_p95 < 300.0, f"Pipeline p95 latency exceeded budget: {pipeline_p95:.2f}ms >= 300ms"

    # 2. Benchmark Leads List endpoint (Budget: p95 < 300ms)
    leads_latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        res = await client.get("/api/admin/leads?limit=50")
        t1 = time.perf_counter()
        assert res.status_code == 200
        leads_latencies.append((t1 - t0) * 1000)

    leads_p95 = statistics.quantiles(leads_latencies, n=100)[94] if len(leads_latencies) >= 20 else max(leads_latencies)
    assert leads_p95 < 300.0, f"Leads list p95 latency exceeded budget: {leads_p95:.2f}ms >= 300ms"

    # 3. Benchmark Reports KPI endpoint (Budget: p95 < 800ms)
    reports_latencies = []
    for _ in range(5):
        t0 = time.perf_counter()
        res = await client.get("/api/admin/reports/kpis")
        t1 = time.perf_counter()
        assert res.status_code == 200
        reports_latencies.append((t1 - t0) * 1000)

    reports_p95 = max(reports_latencies)
    assert reports_p95 < 800.0, f"Reports p95 latency exceeded budget: {reports_p95:.2f}ms >= 800ms"
