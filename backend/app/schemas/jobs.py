"""
Jobs Pydantic Schemas
=====================
Request and response models for roofing jobs, milestones, crew assignment,
and field operations.
"""

from datetime import datetime, date
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


class JobCreate(BaseModel):
    """
    Schema for creating/dispatching a new project job.
    Supports snake_case and camelCase parameters.
    """
    lead_id: Optional[int] = None
    leadId: Optional[int] = None
    client_id: Optional[int] = None
    clientId: Optional[int] = None
    estimate_id: Optional[int] = None
    estimateId: Optional[int] = None

    customer_name: Optional[str] = None
    customerName: Optional[str] = None
    customer_phone: Optional[str] = None
    customerPhone: Optional[str] = None
    customer_email: Optional[str] = None
    customerEmail: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None

    service_type: Optional[str] = "Residential Roofing"
    serviceType: Optional[str] = None
    contract_value: float = Field(0.0, ge=0)
    contractValue: Optional[float] = None

    scheduled_start: Optional[Union[date, str]] = None
    scheduledStart: Optional[Union[date, str]] = None
    estimated_days: int = Field(3, ge=1)
    estimatedDays: Optional[int] = None
    crew_lead: Optional[str] = None
    crewLead: Optional[str] = None
    crew_members: List[str] = Field(default_factory=list)
    crewMembers: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = "permit_pending"
    milestones: Optional[Union[List[Dict[str, Any]], str]] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def normalize_aliases(self) -> "JobCreate":
        self.lead_id = self.lead_id if self.lead_id is not None else self.leadId
        self.client_id = self.client_id if self.client_id is not None else self.clientId
        self.estimate_id = self.estimate_id if self.estimate_id is not None else self.estimateId
        self.customer_name = self.customer_name or self.customerName
        self.customer_phone = self.customer_phone or self.customerPhone
        self.customer_email = self.customer_email or self.customerEmail
        self.service_type = self.serviceType or self.service_type
        if self.contractValue is not None:
            self.contract_value = self.contractValue
        self.scheduled_start = self.scheduled_start or self.scheduledStart
        if self.estimatedDays is not None:
            self.estimated_days = self.estimatedDays
        self.crew_lead = self.crew_lead or self.crewLead
        if self.crewMembers is not None:
            self.crew_members = self.crewMembers

        if not self.customer_name:
            raise ValueError("Customer name is required to create a job.")
        return self


class JobUpdate(BaseModel):
    """
    Schema for updating job status, field notes, milestones, and permits.
    """
    status: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    contract_value: Optional[float] = None
    crew_lead: Optional[str] = None
    crew_members: Optional[List[str]] = None
    scheduled_start: Optional[Union[date, str]] = None
    estimated_days: Optional[int] = None
    actual_start: Optional[Union[date, str]] = None
    actual_end: Optional[Union[date, str]] = None
    weather_delays: Optional[int] = None
    notes: Optional[str] = None
    permit_status: Optional[str] = None
    permit_number: Optional[str] = None
    permit_filed_at: Optional[Union[date, str]] = None
    permit_approved_at: Optional[Union[date, str]] = None
    material_status: Optional[str] = None
    material_ordered_at: Optional[Union[date, str]] = None
    material_delivered_at: Optional[Union[date, str]] = None
    milestones: Optional[Union[List[Dict[str, Any]], Dict[str, Any], str]] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class JobResponse(BaseModel):
    """
    Typed response model representing a job.
    """
    id: int
    job_number: str
    status: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    service_type: Optional[str] = None
    contract_value: float
    permit_status: str = "not_filed"
    permit_number: Optional[str] = None
    material_status: str = "not_ordered"
    crew_lead: Optional[str] = None
    crew_members: List[str] = Field(default_factory=list)
    scheduled_start: Optional[date] = None
    estimated_days: int = 3
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    weather_delays: int = 0
    milestones: Optional[Any] = None
    notes: Optional[str] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    estimate_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
