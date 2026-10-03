from __future__ import annotations

from typing import Any
from sqlalchemy import text

from app.core.authz import Principal
from app.core.uow import UnitOfWork


async def log_activity(
    uow: UnitOfWork,
    entity_type: str,
    entity_id: int,
    action: str,
    actor: Principal | None = None,
    client_id: int | None = None,
    title: str | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Logs an audit activity record into the activities table.
    The actor identity is derived strictly from the authenticated Principal,
    never from unverified user request payloads.
    """
    if actor:
        user_id = actor.id
        user_name = actor.name or actor.email or f"User #{actor.id}"
        role_label = actor.role.replace("_", " ").title() if actor.role else "Staff"
        performed_by = f"{user_name} ({role_label})"
    else:
        user_id = None
        user_name = "System"
        performed_by = "System Automation"

    activity_title = title or f"{entity_type.capitalize()} {action.replace('_', ' ')}"

    insert_sql = text("""
        INSERT INTO activities (
            entity_type, entity_id, client_id, activity_type,
            title, description, performed_by, user_id, user_name, created_at
        )
        VALUES (
            :entity_type, :entity_id, :client_id, :activity_type,
            :title, :description, :performed_by, :user_id, :user_name, NOW()
        )
        RETURNING *
    """)

    result = await uow.session.execute(
        insert_sql,
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "client_id": client_id,
            "activity_type": action,
            "title": activity_title,
            "description": description,
            "performed_by": performed_by,
            "user_id": user_id,
            "user_name": user_name,
        },
    )
    row = result.mappings().first()
    assert row is not None
    return dict(row)
