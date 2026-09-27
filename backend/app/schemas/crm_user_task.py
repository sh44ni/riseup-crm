from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List, Literal
from datetime import datetime

PriorityEnum = Literal["urgent", "high", "normal", "low"]
WorkCategoryEnum = Literal["Rise Up", "Content Creation", "Marketing"]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class PersonalTaskBase(CamelModel):
    title: str = Field(..., min_length=1, max_length=255, description="Task content or reminder title")
    priority: PriorityEnum = Field("normal", description="Urgent, High, Normal, Low")
    work_category: WorkCategoryEnum = Field("Rise Up", description="Rise Up, Content Creation, Marketing")
    due_date: Optional[str] = Field("Today", max_length=50)
    sort_order: Optional[int] = Field(0)
    notes: Optional[str] = None


class PersonalTaskCreate(PersonalTaskBase):
    id: Optional[str] = None


class PersonalTaskUpdate(CamelModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    priority: Optional[PriorityEnum] = None
    work_category: Optional[WorkCategoryEnum] = None
    completed: Optional[bool] = None
    due_date: Optional[str] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class PersonalTaskResponse(PersonalTaskBase):
    id: str
    user_id: int
    completed: bool
    created_at: datetime
    updated_at: datetime


class PersonalTaskListResponse(CamelModel):
    success: bool = True
    data: List[PersonalTaskResponse]
    total: int
    completed_count: int
    message: str = "Personal tasks retrieved successfully"


class PersonalTaskSingleResponse(CamelModel):
    success: bool = True
    data: PersonalTaskResponse
    message: str = "Task operation completed successfully"
