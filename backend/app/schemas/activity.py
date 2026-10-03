from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ActivityActor(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    type: str = "system"
    ip_address: Optional[str] = None


class ActivityRecord(BaseModel):
    type: str
    id: Optional[str] = None
    label: Optional[str] = None
    client_id: Optional[int] = None
    deleted: bool = False


class ActivityEntry(BaseModel):
    id: int
    occurred_at: datetime
    source: str
    action: str
    actor: ActivityActor
    record: ActivityRecord
    changed_fields: List[str] = []
    categories: List[str] = []
    changes: Optional[Dict[str, Any]] = None


class ActivityDetail(ActivityEntry):
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None


class ActivityPage(BaseModel):
    success: bool = True
    items: List[ActivityEntry]
    next_cursor: Optional[str] = None


class ActivityDetailResponse(BaseModel):
    success: bool = True
    data: ActivityDetail


class ActivityEmployee(BaseModel):
    user_id: int
    name: Optional[str] = None
    email: Optional[str] = None


class ActivityFilterOptions(BaseModel):
    success: bool = True
    employees: List[ActivityEmployee]
    record_types: List[str]
    categories: List[str]
    actions: List[str]
