"""
Clients Pydantic Schemas
========================
Request and response models for Client 360 directory, client intake,
and existing homeowner onboarding with pipeline staging and staff attribution.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


class CreateClientRequest(BaseModel):
    """
    Standard new client intake payload.
    """
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    name: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    secondary_phone: Optional[str] = None
    secondaryPhone: Optional[str] = None

    address: Optional[str] = None
    city: Optional[str] = "Oceanside"
    zip: Optional[str] = None
    zip_code: Optional[str] = None

    property_type: Optional[str] = "Single Family"
    propertyType: Optional[str] = None
    roof_type: Optional[str] = "Eagle Concrete Tile"
    roofType: Optional[str] = None
    roof_sqf: Optional[int] = 2400
    roofSqf: Optional[int] = None
    roof_age: Optional[int] = None
    roofAge: Optional[int] = None
    stories: Optional[Union[int, str]] = 1
    hoa: Optional[bool] = False

    notes: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assignedToUserId: Optional[int] = None
    source_type: Optional[str] = "website"
    sourceType: Optional[str] = None
    acquired_by_user_id: Optional[int] = None
    acquiredByUserId: Optional[int] = None
    lead_source_detail: Optional[str] = None
    leadSourceDetail: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def normalize_aliases(self) -> "CreateClientRequest":
        self.full_name = (self.full_name or self.fullName or self.name or "").strip()
        self.secondary_phone = self.secondary_phone or self.secondaryPhone
        self.zip = self.zip or self.zip_code
        self.property_type = self.propertyType or self.property_type or "Single Family"
        self.roof_type = self.roofType or self.roof_type or "Eagle Concrete Tile"
        self.roof_sqf = self.roof_sqf or self.roofSqf or 2400
        self.roof_age = self.roof_age or self.roofAge
        self.assigned_to_user_id = self.assigned_to_user_id or self.assignedToUserId
        self.source_type = self.sourceType or self.source_type or "website"
        self.acquired_by_user_id = self.acquired_by_user_id or self.acquiredByUserId
        self.lead_source_detail = self.leadSourceDetail or self.lead_source_detail
        return self


class CreateExistingClientRequest(BaseModel):
    """
    Onboard an existing homeowner at any stage of the pipeline with full
    property/roof specs, historical context, contract value, and staff attribution.
    """
    full_name: Optional[str] = None
    fullName: Optional[str] = None
    name: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    secondary_phone: Optional[str] = None
    secondaryPhone: Optional[str] = None

    address: Optional[str] = None
    city: Optional[str] = None
    zip: Optional[str] = None
    zip_code: Optional[str] = None
    zipCode: Optional[str] = None

    property_type: Optional[str] = None
    propertyType: Optional[str] = None
    roof_type: Optional[str] = None
    roofType: Optional[str] = None
    roof_sqf: Optional[int] = None
    roofSqf: Optional[int] = None
    roof_age: Optional[int] = None
    roofAge: Optional[int] = None
    stories: Optional[Union[int, str]] = 1
    hoa: Optional[bool] = False

    # Pipeline & Project Context
    pipeline_stage: Optional[str] = None
    pipelineStage: Optional[str] = None
    service_type: Optional[str] = None
    serviceType: Optional[str] = None
    contract_value: Optional[float] = None
    contractValue: Optional[float] = None
    estimated_value: Optional[float] = None
    estimatedValue: Optional[float] = None
    client_since: Optional[Union[datetime, str]] = None
    clientSince: Optional[Union[datetime, str]] = None
    notes: Optional[str] = None

    # Staff Attribution & Assignment
    assigned_to_user_id: Optional[int] = None
    assignedToUserId: Optional[int] = None
    source_type: Optional[str] = None
    sourceType: Optional[str] = None
    acquired_by_user_id: Optional[int] = None
    acquiredByUserId: Optional[int] = None
    lead_source_detail: Optional[str] = None
    leadSourceDetail: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def normalize_aliases(self) -> "CreateExistingClientRequest":
        self.full_name = (self.full_name or self.fullName or self.name or "").strip()
        self.secondary_phone = self.secondary_phone or self.secondaryPhone
        self.city = self.city or "Oceanside"
        self.zip = self.zip or self.zip_code or self.zipCode or "92054"
        self.property_type = self.propertyType or self.property_type or "Single Family"
        self.roof_type = self.roofType or self.roof_type or "Eagle Concrete Tile"
        self.roof_sqf = self.roofSqf if self.roofSqf is not None else (self.roof_sqf if self.roof_sqf is not None else 2400)
        self.roof_age = self.roofAge if self.roofAge is not None else self.roof_age
        self.pipeline_stage = self.pipelineStage or self.pipeline_stage or "active_jobs"
        self.service_type = self.serviceType or self.service_type or "Roof Replacement"
        val = self.contractValue if self.contractValue is not None else (
            self.contract_value if self.contract_value is not None else (
                self.estimatedValue if self.estimatedValue is not None else (
                    self.estimated_value if self.estimated_value is not None else 0.0
                )
            )
        )
        self.contract_value = float(val)
        self.client_since = self.clientSince or self.client_since
        self.assigned_to_user_id = self.assignedToUserId if self.assignedToUserId is not None else self.assigned_to_user_id
        self.source_type = self.sourceType or self.source_type or "team_member"
        self.acquired_by_user_id = self.acquiredByUserId if self.acquiredByUserId is not None else self.acquired_by_user_id
        self.lead_source_detail = self.leadSourceDetail or self.lead_source_detail
        return self


class ClientResponse(BaseModel):
    ok: bool = True
    client: Dict[str, Any]
    lead: Optional[Dict[str, Any]] = None
    job: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
