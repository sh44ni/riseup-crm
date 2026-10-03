from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class LeadCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    full_name: str = Field(..., min_length=1, description="Lead full name")
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None
    priority: Optional[str] = "medium"
    pipeline_stage: Optional[str] = "stage_1_lead_gen"
    assigned_to_user_id: Optional[int] = None
    assigned_to: Optional[int] = None
    lead_source: Optional[str] = None
    source_type: Optional[str] = None
    roof_sqf: Optional[float] = None
    roof_squares: Optional[float] = None
    roof_pitch: Optional[str] = None
    stories: Optional[int] = None
    roof_type: Optional[str] = None
    estimated_value: Optional[float] = None

    def canonical_assigned_to(self) -> Optional[int]:
        return self.assigned_to_user_id or self.assigned_to

    def canonical_source(self) -> Optional[str]:
        return self.lead_source or self.source_type


class LeadUpdatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    pipeline_stage: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to: Optional[int] = None
    lead_source: Optional[str] = None
    source_type: Optional[str] = None
    lost_reason: Optional[str] = None
    lost_notes: Optional[str] = None
    lost_at: Optional[Any] = None
    roof_sqf: Optional[float] = None
    roof_squares: Optional[float] = None
    roof_pitch: Optional[str] = None
    stories: Optional[int] = None
    roof_type: Optional[str] = None
    estimated_value: Optional[float] = None
    site_visit_scheduled_at: Optional[Any] = None
    site_visit_completed_at: Optional[Any] = None

    def canonical_assigned_to(self) -> Optional[int]:
        return self.assigned_to_user_id or self.assigned_to


class LeadActivityCreatePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: Optional[str] = "Note Logged"
    description: Optional[str] = None
    activity_type: Optional[str] = "note"
    activityType: Optional[str] = None
    authorName: Optional[str] = None
    authorRole: Optional[str] = None

    def canonical_activity_type(self) -> str:
        return self.activityType or self.activity_type or "note"
