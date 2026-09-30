from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc, case
from typing import Dict, Any, List
import uuid
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.permissions import require_auth_user
from app.models.crm_user_task import UserPersonalTask
from app.schemas.crm_user_task import (
    PersonalTaskCreate,
    PersonalTaskUpdate,
    PersonalTaskListResponse,
    PersonalTaskSingleResponse,
    PersonalTaskResponse,
)

router = APIRouter(prefix="/users/me/tasks", tags=["User Personal Sticky Notes"])

def resolve_effective_user_id(user: Any) -> int:
    if hasattr(user, "id"):
        uid = user.id
    elif isinstance(user, dict):
        uid = user.get("id")
    else:
        uid = 1
    try:
        return int(uid)
    except Exception:
        return 1

@router.get("", response_model=PersonalTaskListResponse, response_model_by_alias=True)
async def get_my_personal_tasks(
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = resolve_effective_user_id(user)

    priority_order = case(
        (UserPersonalTask.priority == "urgent", 1),
        (UserPersonalTask.priority == "high", 2),
        (UserPersonalTask.priority == "normal", 3),
        (UserPersonalTask.priority == "low", 4),
        else_=5,
    )

    stmt = (
        select(UserPersonalTask)
        .where(UserPersonalTask.user_id == user_id)
        .order_by(
            UserPersonalTask.completed.asc(),
            UserPersonalTask.sort_order.asc(),
            priority_order.asc(),
            desc(UserPersonalTask.created_at),
        )
    )
    result = await db.execute(stmt)
    tasks = list(result.scalars().all())

    completed_count = sum(1 for t in tasks if t.completed)

    return PersonalTaskListResponse(
        success=True,
        data=[PersonalTaskResponse.model_validate(t) for t in tasks],
        total=len(tasks),
        completed_count=completed_count,
        message="Personal tasks retrieved successfully",
    )


@router.post("", response_model=PersonalTaskSingleResponse, response_model_by_alias=True, status_code=status.HTTP_201_CREATED)
async def create_personal_task(
    payload: PersonalTaskCreate,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = resolve_effective_user_id(user)
    task_id = payload.id or f"task_{uuid.uuid4().hex[:12]}"

    task = UserPersonalTask(
        id=task_id,
        user_id=user_id,
        title=payload.title,
        priority=payload.priority,
        work_category=payload.work_category,
        due_date=payload.due_date,
        completed=False,
        sort_order=payload.sort_order or 0,
        notes=payload.notes,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    return PersonalTaskSingleResponse(
        success=True,
        data=PersonalTaskResponse.model_validate(task),
        message="Sticky note created",
    )


@router.put("/{task_id}", response_model=PersonalTaskSingleResponse, response_model_by_alias=True)
async def update_personal_task(
    task_id: str,
    payload: PersonalTaskUpdate,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = resolve_effective_user_id(user)
    stmt = select(UserPersonalTask).where(
        UserPersonalTask.id == task_id,
        UserPersonalTask.user_id == user_id,
    )
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(task, key, value)

    task.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)

    return PersonalTaskSingleResponse(
        success=True,
        data=PersonalTaskResponse.model_validate(task),
        message="Sticky note updated",
    )


@router.delete("/{task_id}")
async def delete_personal_task(
    task_id: str,
    user: Any = Depends(require_auth_user()),
    db: AsyncSession = Depends(get_db),
):
    user_id = resolve_effective_user_id(user)
    stmt = select(UserPersonalTask).where(
        UserPersonalTask.id == task_id,
        UserPersonalTask.user_id == user_id,
    )
    result = await db.execute(stmt)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    await db.delete(task)
    await db.commit()

    return {"success": True, "data": {"id": task_id}, "message": "Task deleted successfully"}
