"""
Service for scheduling and deduplicating follow-up reminders across the CRM.
Ensures zero duplicate pending reminders and maintains consistent due times.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def schedule_follow_up_reminder(
    db: AsyncSession,
    lead_id: int,
    due_at: datetime,
    title: str,
    description: str = "",
    assigned_to_user_id: Optional[int] = None,
    created_by_user_id: Optional[int] = None,
    client_id: Optional[int] = None
) -> None:
    """
    1. Updates leads.follow_up_at = due_at.
    2. Cancels/supercedes any existing pending follow-up reminder for this lead in `tasks` (avoiding duplicates).
    3. Inserts a fresh high-priority reminder task in `tasks`.
    """
    if due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=timezone.utc)

    # 1. Update lead follow_up_at
    await db.execute(
        text("""
            UPDATE leads
            SET follow_up_at = :due_at,
                updated_at = NOW()
            WHERE id = :lead_id
        """),
        {"due_at": due_at, "lead_id": lead_id}
    )

    # Resolve client_id and assigned_to_user_id if not explicitly provided
    if client_id is None or assigned_to_user_id is None:
        lead_row = (await db.execute(
            text("SELECT client_id, assigned_to_user_id FROM leads WHERE id = :lead_id"),
            {"lead_id": lead_id}
        )).mappings().first()
        if lead_row:
            if client_id is None:
                client_id = lead_row.get("client_id")
            if assigned_to_user_id is None:
                assigned_to_user_id = lead_row.get("assigned_to_user_id")

    # 2. Supercede any uncompleted reminders for this lead to guarantee ZERO duplicate reminders
    await db.execute(
        text("""
            UPDATE tasks
            SET completed_at = NOW(),
                description = COALESCE(description, '') || ' [Superceded by new follow-up reminder]'
            WHERE entity_type = 'lead' AND entity_id = :lead_id
              AND completed_at IS NULL
              AND (event_type = 'reminder' OR title ILIKE '%follow-up%')
        """),
        {"lead_id": lead_id}
    )

    # 3. Insert fresh reminder task
    await db.execute(
        text("""
            INSERT INTO tasks (
                entity_type, entity_id, client_id, title, description,
                assigned_to_user_id, created_by_user_id, event_type,
                due_at, priority, work_category, created_at
            ) VALUES (
                'lead', :lead_id, :client_id, :title, :description,
                :assigned_to_user_id, :created_by_user_id, 'reminder',
                :due_at, 'high', 'Follow-Up', NOW()
            )
        """),
        {
            "lead_id": lead_id,
            "client_id": client_id,
            "title": title,
            "description": description,
            "assigned_to_user_id": assigned_to_user_id,
            "created_by_user_id": created_by_user_id,
            "due_at": due_at,
        }
    )
