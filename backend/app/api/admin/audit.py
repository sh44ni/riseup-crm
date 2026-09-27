from typing import Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.core.audit import record_audit_log
from app.middlewares.auth import require_permission, get_optional_current_user
from app.services.sync import auto_heal_dataflow_sync

router = APIRouter(prefix="/api/admin", tags=["Audit & Integrity"])

@router.get("/audit", dependencies=[Depends(require_permission("analytics:view"))])
async def get_system_audit(db: AsyncSession = Depends(get_db)):
    counts_sql = text("""
        SELECT 
            (SELECT COUNT(*) FROM leads) as total_leads,
            (SELECT COUNT(*) FROM jobs) as total_jobs,
            (SELECT COUNT(*) FROM clients) as total_clients,
            (SELECT COUNT(*) FROM estimates) as total_estimates,
            (SELECT COUNT(*) FROM invoices) as total_invoices,
            (SELECT COUNT(*) FROM warranties) as total_warranties,
            (SELECT COUNT(*) FROM inspections) as total_inspections,
            (SELECT COUNT(*) FROM reviews) as total_reviews,
            (SELECT COUNT(*) FROM tasks) as total_tasks,
            (SELECT COUNT(*) FROM audit_logs) as total_audit_logs
    """)
    counts = (await db.execute(counts_sql)).mappings().first()

    integrity_sql = text("""
        SELECT 
            (SELECT COUNT(*) FROM jobs WHERE lead_id IS NULL) as jobs_null_lead,
            (SELECT COUNT(*) FROM jobs WHERE client_id IS NULL) as jobs_null_client,
            (SELECT COUNT(*) FROM leads WHERE client_id IS NULL) as leads_null_client,
            (SELECT COUNT(*) FROM estimates WHERE client_id IS NULL) as estimates_null_client,
            (SELECT COUNT(*) FROM invoices WHERE client_id IS NULL) as invoices_null_client,
            (SELECT COUNT(*) FROM warranties WHERE client_id IS NULL) as warranties_null_client,
            (SELECT COUNT(*) FROM reviews WHERE client_id IS NULL) as reviews_null_client,
            (SELECT COUNT(*) FROM tasks WHERE client_id IS NULL) as tasks_null_client,
            (SELECT COUNT(*) FROM leads l JOIN jobs j ON j.lead_id = l.id WHERE l.pipeline_stage != 'stage_5_completion_followup') as pipeline_stage_mismatches
    """)
    integrity = (await db.execute(integrity_sql)).mappings().first()

    total_issues = sum(int(v or 0) for v in integrity.values())
    is_healthy = total_issues == 0

    return {
        "ok": True,
        "status": "healthy" if is_healthy else "issues_detected",
        "totalIssues": total_issues,
        "counts": dict(counts) if counts else {},
        "integrity": dict(integrity) if integrity else {},
    }

@router.post("/audit", dependencies=[Depends(require_permission("settings:edit"))])
async def trigger_auto_heal(request: Request, db: AsyncSession = Depends(get_db)):
    result = await auto_heal_dataflow_sync(db)
    await record_audit_log(
        db=db,
        action="system.auto_heal",
        resource_type="system",
        resource_id="0",
        changes=result,
        request=request
    )
    return {
        "ok": True,
        "message": "Dataflow synchronization and auto-healing routine completed successfully.",
        "result": result,
    }

@router.get("/audit/logs", dependencies=[Depends(require_permission("settings:edit"))])
async def get_audit_logs(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Search and filter historical admin action audit logs.
    """
    conditions = []
    params = {"limit": limit, "offset": offset}

    if action:
        conditions.append("action = :action")
        params["action"] = action
    if resource_type:
        conditions.append("resource_type = :res_type")
        params["res_type"] = resource_type

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    sql = text(f"""
        SELECT id, user_id, user_email, user_role, action, resource_type,
               resource_id, ip_address, user_agent, changes, created_at
        FROM audit_logs
        {where}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)

    rows = (await db.execute(sql, params)).mappings().all()
    count_sql = text(f"SELECT COUNT(*) FROM audit_logs {where}")
    total_count = (await db.execute(count_sql, params)).scalar_one()

    return {
        "ok": True,
        "total": total_count,
        "logs": [dict(r) for r in rows],
    }

@router.post("/migrate")
async def run_db_migration(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_optional_current_user)
):
    header_key = request.headers.get("x-migration-key")
    query_key = request.query_params.get("key")
    key = header_key or query_key

    is_authorized = (
        (user and user.role in ("owner", "project_manager")) or
        (settings.MIGRATION_KEY and key == settings.MIGRATION_KEY) or
        (settings.ADMIN_PASSWORD and key == settings.ADMIN_PASSWORD)
    )

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Forbidden. Owner authentication or valid migration key required.")

    # Execute auto-heal dataflow sync
    res = await auto_heal_dataflow_sync(db)
    return {"ok": True, "message": "Database migrations and integrity sync complete", "details": res}
