"""Employee activity audit log (read-only; managers with ``activity.view`` only).

There is deliberately no create/update/delete endpoint: entries are written by database
triggers and cannot be modified through the application.
"""
import csv
import io
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit_log
from app.core.database import get_db
from app.core.permissions import require_permission
from app.schemas.activity import ActivityDetailResponse, ActivityFilterOptions, ActivityPage, ActivitySummary
from app.services import activity_log as svc

router = APIRouter(prefix="/activity", tags=["Staff Activity"])

ALLOWED_ACTIONS = set(svc.ACTIONS)


def _filters(
    employee_id: Optional[int] = Query(None, ge=1),
    client_id: Optional[int] = Query(None, ge=1),
    client: Optional[str] = Query(None, max_length=120),
    action: Optional[str] = Query(None, max_length=40),
    category: Optional[str] = Query(None, max_length=40),
    record_type: Optional[str] = Query(None, max_length=60),
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    q: Optional[str] = Query(None, max_length=120),
    ip: Optional[str] = Query(None, max_length=64),
) -> svc.ActivityFilters:
    if action and action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=422, detail=f"action must be one of {sorted(ALLOWED_ACTIONS)}")
    if category and category not in svc.CATEGORIES:
        raise HTTPException(status_code=422, detail=f"category must be one of {svc.CATEGORIES}")
    return svc.ActivityFilters(
        employee_id=employee_id,
        client_id=client_id,
        client_query=client,
        action=action,
        category=category,
        record_type=record_type,
        date_from=date_from,
        date_to=date_to,
        q=q,
        ip=ip,
    )


@router.get("", response_model=ActivityPage)
async def list_activity(
    filters: svc.ActivityFilters = Depends(_filters),
    cursor: Optional[str] = Query(None, max_length=200),
    limit: int = Query(50, ge=1, le=svc.MAX_PAGE),
    user: Any = Depends(require_permission("activity.view")),
    db: AsyncSession = Depends(get_db),
):
    try:
        items, next_cursor = await svc.list_activity(db, filters, cursor, limit)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cursor")
    return ActivityPage(items=items, next_cursor=next_cursor)


@router.get("/filters", response_model=ActivityFilterOptions)
async def activity_filter_options(
    user: Any = Depends(require_permission("activity.view")),
    db: AsyncSession = Depends(get_db),
):
    return await svc.filter_options(db)


@router.get("/summary", response_model=ActivitySummary)
async def activity_summary(
    days: int = Query(7, ge=1, le=90),
    user: Any = Depends(require_permission("activity.view")),
    db: AsyncSession = Depends(get_db),
):
    return ActivitySummary(**await svc.summary(db, days))


@router.get("/export.csv")
async def export_activity_csv(
    request: Request,
    filters: svc.ActivityFilters = Depends(_filters),
    user: Any = Depends(require_permission("activity.view")),
    db: AsyncSession = Depends(get_db),
):
    entries = await svc.export_rows(db, filters)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["when_utc", "employee", "email", "role", "ip", "action", "record_type", "record_id", "record", "client_id", "fields_changed", "changes"]
    )
    for e in entries:
        writer.writerow(
            [
                e.occurred_at.isoformat(),
                _csv_safe(e.actor.name),
                _csv_safe(e.actor.email),
                e.actor.role or "",
                e.actor.ip_address or "",
                e.action,
                e.record.type,
                e.record.id or "",
                _csv_safe(e.record.label),
                e.record.client_id or "",
                ";".join(e.changed_fields),
                _csv_safe(str(e.changes) if e.changes else ""),
            ]
        )
    await record_audit_log(
        db=db,
        action="activity.export",
        resource_type="activity",
        resource_id="export",
        user_id=getattr(user, "id", None),
        user_email=getattr(user, "email", None),
        user_role=getattr(user, "role", None),
        changes={"rows": len(entries)},
        request=request,
    )
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="activity-log.csv"'},
    )


@router.get("/{entry_id}", response_model=ActivityDetailResponse)
async def get_activity_entry(
    entry_id: int,
    user: Any = Depends(require_permission("activity.view")),
    db: AsyncSession = Depends(get_db),
):
    detail = await svc.get_activity_detail(db, entry_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Activity entry not found")
    return ActivityDetailResponse(data=detail)


def _csv_safe(value: Optional[str]) -> str:
    """Neutralise spreadsheet formula injection in exported text."""
    if not value:
        return ""
    return "'" + value if value[0] in "=+-@\t\r" else value
