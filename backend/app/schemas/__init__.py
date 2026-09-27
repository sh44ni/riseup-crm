"""
Application Pydantic Schemas
============================
Central export registry for API request/response validation models.
"""

from app.schemas.contracts import (
    PublicSignContractRequest,
    ContractSignatureSchema,
    ContractResponse,
    ContractBuildRequest,
    BuildContractRequest,
    SendContractRequest,
    SendContractSmsRequest,
)
from app.schemas.estimates import (
    EstimateCreate,
    EstimateUpdate,
    EstimateResponse,
)
from app.schemas.leads import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
)
from app.schemas.jobs import (
    JobCreate,
    JobUpdate,
    JobResponse,
)
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserProfileResponse,
    LoginResponse,
)
from app.schemas.clients import (
    CreateClientRequest,
    CreateExistingClientRequest,
    ClientResponse,
)

__all__ = [
    # Contracts
    "PublicSignContractRequest",
    "ContractSignatureSchema",
    "ContractResponse",
    "ContractBuildRequest",
    "SendContractRequest",
    "SendContractSmsRequest",
    # Estimates
    "EstimateCreate",
    "EstimateUpdate",
    "EstimateResponse",
    # Leads
    "LeadCreate",
    "LeadUpdate",
    "LeadResponse",
    # Jobs
    "JobCreate",
    "JobUpdate",
    "JobResponse",
    # Auth
    "LoginRequest",
    "TokenResponse",
    "UserProfileResponse",
    "LoginResponse",
    # Clients
    "CreateClientRequest",
    "CreateExistingClientRequest",
    "ClientResponse",
]
