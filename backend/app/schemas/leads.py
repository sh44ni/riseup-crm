"""
Leads Pydantic Schemas
======================
Request and response models for lead ingestion, CRM pipeline staging,
assignment, and tracking.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


class LeadCreate(BaseModel):
    """
    Schema for creating a new CRM lead.
    Normalizes snake_case and camelCase parameters.
    """
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    name: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = "San Diego"
    zip: Optional[str] = None

    service_type: Optional[str] = "Residential Roofing"
    serviceType: Optional[str] = None
    notes: Optional[str] = None
    form_type: Optional[str] = "manual"
    lead_source: Optional[str] = "manual"
    source_type: Optional[str] = "manual"
    lead_source_detail: Optional[str] = None

    status: Optional[str] = "new"
    priority: Optional[str] = "cool"
    pipeline_stage: Optional[str] = "stage_1_lead_gen"

    roof_sqf: Optional[int] = None
    roofSqf: Optional[int] = None
    sqf: Optional[int] = None
    roof_squares: Optional[float] = None
    roofSquares: Optional[float] = None
    roof_pitch: Optional[str] = "4:12"
    pitch: Optional[str] = None
    stories: Optional[Union[int, str]] = 1
    roof_type: Optional[str] = "Spanish Tile"
    roofType: Optional[str] = None
    estimated_value: Optional[float] = None
    estimatedValue: Optional[float] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def normalize_aliases(self) -> "LeadCreate":
        self.full_name = self.full_name or self.fullName or self.name
        self.service_type = self.serviceType or self.service_type
        self.roof_sqf = self.roof_sqf or self.roofSqf or self.sqf
        self.roof_squares = self.roof_squares or self.roofSquares
        self.roof_pitch = self.pitch or self.roof_pitch
        self.roof_type = self.roofType or self.roof_type
        self.estimated_value = self.estimated_value if self.estimated_value is not None else self.estimatedValue

        if not self.full_name or not self.full_name.strip():
            raise ValueError("Full name is required to create a lead.")
        self.full_name = self.full_name.strip()
        return self


class LeadUpdate(BaseModel):
    """
    Schema for partial lead updates.
    """
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    serviceType: Optional[str] = None
    notes: Optional[str] = None

    status: Optional[str] = None
    priority: Optional[str] = None
    pipeline_stage: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to: Optional[str] = None

    roof_sqf: Optional[int] = None
    roof_squares: Optional[float] = None
    roof_pitch: Optional[str] = None
    stories: Optional[Union[int, str]] = None
    roof_type: Optional[str] = None
    estimated_value: Optional[float] = None
    lost_reason: Optional[str] = None
    discount_applied: Optional[str] = None
    financing_interested: Optional[bool] = None
    address_confirmed: Optional[bool] = None

    # Appointment scheduling
    site_visit_scheduled_at: Optional[datetime] = None
    site_visit_completed_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class LeadResponse(BaseModel):
    """
    Typed response model representing a CRM lead.
    """
    id: int
    client_id: Optional[int] = None
    form_type: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None
    status: str
    priority: str
    lead_score: int = 0
    lead_source: Optional[str] = None
    pipeline_stage: str
    estimated_value: Optional[float] = None
    assigned_to_user_id: Optional[int] = None
    assigned_to: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
