"""Read-only queries over the append-only ``staff_activity_log`` (ORM only)."""
import base64
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, cast, BigInteger, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.client import Client
from app.models.staff_activity import StaffActivity
from app.schemas.activity import (
    ActivityActor,
    ActivityDetail,
    ActivityEmployee,
    ActivityEntry,
    ActivityFilterOptions,
    ActivityRecord,
)

CATEGORIES = ["assignment", "status", "contact", "financial", "security", "other"]
ACTIONS = ["create", "update", "delete", "security"]
MAX_PAGE = 100
EXPORT_CAP = 10000


@dataclass
class ActivityFilters:
    employee_id: Optional[int] = None
    client_id: Optional[int] = None
    client_query: Optional[str] = None
    action: Optional[str] = None
    category: Optional[str] = None
    record_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    q: Optional[str] = None
    ip: Optional[str] = None


def encode_cursor(occurred_at: datetime, row_id: int) -> str:
    return base64.urlsafe_b64encode(f"{occurred_at.isoformat()}|{row_id}".encode()).decode()


def decode_cursor(cursor: str) -> Tuple[datetime, int]:
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, _, row_id = raw.rpartition("|")
    return datetime.fromisoformat(ts), int(row_id)


def _like(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")
    return f"%{escaped}%"


def apply_filters(stmt, f: ActivityFilters):
    A = StaffActivity
    if f.employee_id is not None:
        stmt = stmt.where(A.actor_user_id == f.employee_id)
    if f.client_id is not None:
        stmt = stmt.where(
            or_(A.client_id == f.client_id, and_(A.table_name == "clients", A.record_id == str(f.client_id)))
        )
    if f.client_query:
        pattern = _like(f.client_query.strip())
        by_live_name = select(Client.id).where(Client.full_name.ilike(pattern, escape="\\"))
        inner = aliased(StaffActivity)
        by_logged_name = select(cast(inner.record_id, BigInteger)).where(
            inner.table_name == "clients", inner.record_label.ilike(pattern, escape="\\")
        )
        stmt = stmt.where(
            or_(
                A.client_id.in_(by_live_name),
                A.client_id.in_(by_logged_name),
                and_(A.table_name == "clients", A.record_label.ilike(pattern, escape="\\")),
            )
        )
    if f.action:
        if f.action == "security":
            stmt = stmt.where(A.source == "security")
        else:
            stmt = stmt.where(A.action == f.action)
    if f.category:
        stmt = stmt.where(A.categories.any(f.category))
    if f.record_type:
        stmt = stmt.where(A.table_name == f.record_type)
    if f.date_from:
        stmt = stmt.where(A.occurred_at >= f.date_from)
    if f.date_to:
        stmt = stmt.where(A.occurred_at <= f.date_to)
    if f.ip:
        stmt = stmt.where(A.ip_address == f.ip.strip())
    if f.q:
        pattern = _like(f.q.strip())
        stmt = stmt.where(
            or_(
                A.record_label.ilike(pattern, escape="\\"),
                A.actor_name.ilike(pattern, escape="\\"),
                A.actor_email.ilike(pattern, escape="\\"),
                A.action.ilike(pattern, escape="\\"),
            )
        )
    return stmt


def _deleted_flag():
    later = aliased(StaffActivity)
    return exists().where(
        later.table_name == StaffActivity.table_name,
        later.record_id == StaffActivity.record_id,
        later.action == "delete",
        later.source == "data",
    )


def _entry_from_row(row: StaffActivity, deleted: bool) -> dict:
    return dict(
        id=row.id,
        occurred_at=row.occurred_at,
        source=row.source,
        action=row.action,
        actor=ActivityActor(
            user_id=row.actor_user_id,
            name=row.actor_name,
            email=row.actor_email,
            role=row.actor_role,
            type=row.actor_type,
            ip_address=row.ip_address,
        ),
        record=ActivityRecord(
            type=row.table_name,
            id=row.record_id,
            label=row.record_label,
            client_id=row.client_id,
            deleted=bool(deleted) and row.source == "data",
        ),
        changed_fields=list(row.changed_fields or []),
        categories=list(row.categories or []),
        changes=row.changes,
    )


async def list_activity(
    db: AsyncSession, filters: ActivityFilters, cursor: Optional[str], limit: int
) -> Tuple[List[ActivityEntry], Optional[str]]:
    limit = max(1, min(limit, MAX_PAGE))
    stmt = apply_filters(select(StaffActivity, _deleted_flag()), filters)
    if cursor:
        ts, row_id = decode_cursor(cursor)
        stmt = stmt.where(
            or_(
                StaffActivity.occurred_at < ts,
                and_(StaffActivity.occurred_at == ts, StaffActivity.id < row_id),
            )
        )
    stmt = stmt.order_by(StaffActivity.occurred_at.desc(), StaffActivity.id.desc()).limit(limit + 1)
    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    items = [ActivityEntry(**_entry_from_row(r, d)) for r, d in rows]
    next_cursor = encode_cursor(rows[-1][0].occurred_at, rows[-1][0].id) if has_more and rows else None
    return items, next_cursor


async def get_activity_detail(db: AsyncSession, entry_id: int) -> Optional[ActivityDetail]:
    row = (
        await db.execute(select(StaffActivity, _deleted_flag()).where(StaffActivity.id == entry_id))
    ).first()
    if not row:
        return None
    entity, deleted = row
    return ActivityDetail(
        **_entry_from_row(entity, deleted), old_values=entity.old_values, new_values=entity.new_values
    )


async def export_rows(db: AsyncSession, filters: ActivityFilters) -> List[ActivityEntry]:
    stmt = apply_filters(select(StaffActivity, _deleted_flag()), filters)
    stmt = stmt.order_by(StaffActivity.occurred_at.desc(), StaffActivity.id.desc()).limit(EXPORT_CAP)
    rows = (await db.execute(stmt)).all()
    return [ActivityEntry(**_entry_from_row(r, d)) for r, d in rows]


async def filter_options(db: AsyncSession) -> ActivityFilterOptions:
    A = StaffActivity
    emp_rows = (
        await db.execute(
            select(A.actor_user_id, func.max(A.actor_name), func.max(A.actor_email))
            .where(A.actor_user_id.is_not(None))
            .group_by(A.actor_user_id)
            .order_by(func.max(A.actor_name))
        )
    ).all()
    types = (await db.execute(select(A.table_name).distinct().order_by(A.table_name))).scalars().all()
    return ActivityFilterOptions(
        employees=[ActivityEmployee(user_id=uid, name=name, email=email) for uid, name, email in emp_rows],
        record_types=list(types),
        categories=CATEGORIES,
        actions=ACTIONS,
    )
