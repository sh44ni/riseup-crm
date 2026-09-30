"""
Contracts Pydantic Schemas
===========================
Request and response models for public and administrative contract workflows,
including California CSLB statutory compliance validation (BPC 7159).
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict, model_validator


class PublicSignContractRequest(BaseModel):
    """
    Public electronic execution request schema.
    Enforces mandatory California CSLB statutory disclosures under BPC 7159.
    """
    client_initials: str = Field(..., min_length=1, max_length=10, description="Homeowner initials")
    signer_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Full legal name of the signing homeowner")
    signature_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Alias for signer_name")
    signature_type: str = Field("typed", description="'typed' | 'drawn' | 'uploaded'")
    signature_svg: Optional[str] = Field(None, description="Vector SVG signature data")
    signature_data: Optional[str] = Field(None, description="Base64 PNG or font representation of signature")
    is_senior_citizen: bool = Field(False, description="Flag for California 5-day senior cancellation right")
    agreed_terms: bool = Field(True, description="Standard terms agreement")

    # 5 Mandatory California CSLB Statutory Disclosure Flags (CSLB BPC 7159)
    agreed_scope: bool = Field(False, description="Acknowledgment of complete scope of work and materials")
    agreed_milestones: bool = Field(False, description="Acknowledgment of progress payment milestones and down payment limits")
    agreed_refund: bool = Field(False, description="Acknowledgment of refund policy and extra work / change order requirements")
    agreed_disclosures: bool = Field(False, description="Acknowledgment of CSLB license notification, workers comp, and liability insurance")
    agreed_cancellation: bool = Field(False, description="Acknowledgment of statutory 3-day / 5-day Notice of Right to Cancel")

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def validate_statutory_and_signature(self) -> "PublicSignContractRequest":
        # 1. Enforce California CSLB Statutory Disclosures
        statutory_flags = [
            self.agreed_scope,
            self.agreed_milestones,
            self.agreed_refund,
            self.agreed_disclosures,
            self.agreed_cancellation,
        ]
        if not all(bool(f) is True for f in statutory_flags):
            raise ValueError(
                "All California statutory consumer protection disclosures and terms must be acknowledged prior to executing this home improvement contract (CSLB BPC 7159)."
            )

        # 2. Validate Signer Name
        resolved_name = (self.signer_name or self.signature_name or "").strip()
        if not resolved_name or len(resolved_name) < 2:
            raise ValueError("Signer name is required and must be at least 2 characters.")
        self.signer_name = resolved_name
        self.signature_name = resolved_name

        # 3. Ensure valid signature payload is present
        resolved_sig = (self.signature_svg or self.signature_data or "").strip()
        if not resolved_sig:
            raise ValueError("A valid signature ('signature_svg' or 'signature_data') is required.")

        return self


class ContractSignatureSchema(BaseModel):
    """
    Structured record of the executed contract signature and statutory audit trail.
    """
    client_initials: str
    signer_name: str
    signature_type: str = "typed"
    signature_data: Optional[str] = None
    signature_svg: Optional[str] = None
    agreed_scope: bool = True
    agreed_milestones: bool = True
    agreed_refund: bool = True
    agreed_disclosures: bool = True
    agreed_cancellation: bool = True
    is_senior_citizen: bool = False
    signed_ip: Optional[str] = None
    signed_at: Optional[datetime] = None
    compliance_reference: str = "CSLB BPC 7159"

    model_config = ConfigDict(from_attributes=True, extra="allow")


class ContractResponse(BaseModel):
    """
    Standard response schema representing a contract.
    """
    id: int
    contract_number: Optional[str] = None
    lead_id: Optional[int] = None
    estimate_id: Optional[int] = None
    client_id: Optional[int] = None
    job_id: Optional[int] = None
    status: str
    signing_token: Optional[str] = None
    client_signed_at: Optional[datetime] = None
    counter_signed_at: Optional[datetime] = None
    counter_signed_by: Optional[int] = None
    client_initials: Optional[str] = None
    signature_name: Optional[str] = None
    signature_type: Optional[str] = None
    signed_pdf_url: Optional[str] = None
    signed_ip: Optional[str] = None
    contract_data: Optional[Dict[str, Any]] = None
    is_archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")


class ContractBuildRequest(BaseModel):
    lead_id: Optional[int] = None
    contract_id: Optional[int] = None
    estimate_id: Optional[int] = None
    client_id: Optional[int] = None
    contract_data: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True, extra="allow")


BuildContractRequest = ContractBuildRequest


class SendContractRequest(BaseModel):
    to_email: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    custom_message: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class SendContractSmsRequest(BaseModel):
    phone: Optional[str] = None
    custom_message: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, extra="allow")
