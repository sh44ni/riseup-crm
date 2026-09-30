"""
Estimates Pydantic Schemas
===========================
Request and response models for estimate generation, options proposals,
and lifecycle operations.
"""

from datetime import datetime, date
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field, ConfigDict, model_validator


class EstimateCreate(BaseModel):
    """
    Schema for creating an estimate or multi-option proposal.
    Accepts both camelCase and snake_case payload attributes.
    """
    customer_name: Optional[str] = Field(None, description="Full customer name")
    customerName: Optional[str] = Field(None, description="CamelCase alias for customer_name")
    customer_phone: Optional[str] = None
    customerPhone: Optional[str] = None
    customer_email: Optional[str] = None
    customerEmail: Optional[str] = None
    customer_address: Optional[str] = None
    customerAddress: Optional[str] = None
    customer_city: Optional[str] = None
    customerCity: Optional[str] = None
    customer_zip: Optional[str] = None
    customerZip: Optional[str] = None

    lead_id: Optional[int] = None
    leadId: Optional[int] = None
    client_id: Optional[int] = None
    clientId: Optional[int] = None

    service_type: str = Field("Residential Roofing")
    serviceType: Optional[str] = None
    roof_squares: float = Field(25.0, ge=0)
    roofSquares: Optional[float] = None
    roof_pitch: str = Field("4:12")
    roofPitch: Optional[str] = None
    stories: int = Field(1, ge=1)
    tearoff_layers: int = Field(1, ge=0)
    tearoffLayers: Optional[int] = None
    material_id: Optional[str] = "oc_duration"
    materialId: Optional[str] = None
    material_type: Optional[str] = None
    materialType: Optional[str] = None

    addons: Optional[List[Dict[str, Any]]] = None
    margin_pct: float = Field(30.0, ge=0, le=100)
    marginPct: Optional[float] = None
    financing_months: int = Field(60, ge=1)
    financingMonths: Optional[int] = None
    valid_days: int = Field(30, ge=1)
    validDays: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = "draft"

    template_key: Optional[str] = "multi_option_proposal"
    templateKey: Optional[str] = None
    proposal_data: Optional[Dict[str, Any]] = None
    proposalData: Optional[Dict[str, Any]] = None
    pdf_url: Optional[str] = None
    pdfUrl: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def normalize_aliases(self) -> "EstimateCreate":
        self.customer_name = self.customer_name or self.customerName
        self.customer_phone = self.customer_phone or self.customerPhone
        self.customer_email = self.customer_email or self.customerEmail
        self.customer_address = self.customer_address or self.customerAddress
        self.customer_city = self.customer_city or self.customerCity
        self.customer_zip = self.customer_zip or self.customerZip
        self.lead_id = self.lead_id if self.lead_id is not None else self.leadId
        self.client_id = self.client_id if self.client_id is not None else self.clientId
        self.service_type = self.serviceType or self.service_type
        if self.roofSquares is not None:
            self.roof_squares = self.roofSquares
        self.roof_pitch = self.roofPitch or self.roof_pitch
        if self.tearoffLayers is not None:
            self.tearoff_layers = self.tearoffLayers
        self.material_id = self.materialId or self.material_id
        self.material_type = self.materialType or self.material_type
        if self.marginPct is not None:
            self.margin_pct = self.marginPct
        if self.financingMonths is not None:
            self.financing_months = self.financingMonths
        if self.validDays is not None:
            self.valid_days = self.validDays
        self.template_key = self.templateKey or self.template_key
        self.proposal_data = self.proposal_data or self.proposalData
        self.pdf_url = self.pdf_url or self.pdfUrl

        if not self.customer_name:
            raise ValueError("Customer name is required to create an estimate.")
        return self


class EstimateUpdate(BaseModel):
    """
    Schema for partial estimate updates.
    """
    status: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_city: Optional[str] = None
    customer_zip: Optional[str] = None
    service_type: Optional[str] = None
    roof_squares: Optional[float] = None
    roof_pitch: Optional[str] = None
    stories: Optional[int] = None
    tearoff_layers: Optional[int] = None
    material_type: Optional[str] = None
    material_cost: Optional[float] = None
    labor_cost: Optional[float] = None
    addons: Optional[Union[List[Dict[str, Any]], Dict[str, Any], str]] = None
    subtotal: Optional[float] = None
    margin_pct: Optional[float] = None
    total: Optional[float] = None
    financing_months: Optional[int] = None
    monthly_payment: Optional[float] = None
    valid_until: Optional[Union[date, str]] = None
    notes: Optional[str] = None
    sent_at: Optional[Union[datetime, str]] = None
    template_key: Optional[str] = None
    proposal_data: Optional[Union[Dict[str, Any], str]] = None
    pdf_url: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class EstimateResponse(BaseModel):
    """
    Typed response model representing an estimate.
    """
    id: int
    estimate_number: str
    version: int = 1
    status: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    customer_city: Optional[str] = None
    customer_zip: Optional[str] = None
    service_type: str
    roof_squares: float
    roof_pitch: str = "4:12"
    stories: int = 1
    tearoff_layers: int = 1
    material_type: str
    material_cost: Optional[float] = None
    labor_cost: Optional[float] = None
    addons: Optional[Any] = None
    subtotal: Optional[float] = None
    margin_pct: Optional[float] = None
    total: float
    financing_months: int = 60
    monthly_payment: Optional[float] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    template_key: Optional[str] = None
    proposal_data: Optional[Dict[str, Any]] = None
    pdf_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    signature_name: Optional[str] = None
    signature_data: Optional[str] = None
    access_token: Optional[str] = None
    created_by: Optional[int] = None
    is_archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
