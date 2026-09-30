"""
Phase 3 Remediation Test Suite
==============================
Validates:
1. California CSLB statutory compliance enforcement (BPC 7159)
2. Contract portal mock fallback purging & 404 behavior
3. Route deduplication (DELETE estimate, marketing router mount, system estimator routes)
4. Comprehensive Pydantic v2 schemas coverage for contracts, estimates, leads, jobs, and auth
"""

import pytest
from pydantic import ValidationError
from fastapi import HTTPException

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
from app.api.router import api_router
from app.api.admin.estimates import router as estimates_router
from app.api.admin.system import router as system_router
from app.api.admin.estimator import router as estimator_router


class TestCSLBStatutoryCompliance:
    """Verifies California CSLB Home Improvement Contract statutory compliance (BPC 7159)."""

    def test_valid_contract_signing_request(self):
        req = PublicSignContractRequest(
            client_initials="BK",
            signer_name="Bryce Kirklen",
            signature_type="drawn",
            signature_svg="<svg>mock_sig</svg>",
            agreed_scope=True,
            agreed_milestones=True,
            agreed_refund=True,
            agreed_disclosures=True,
            agreed_cancellation=True,
        )
        assert req.client_initials == "BK"
        assert req.signer_name == "Bryce Kirklen"
        assert req.signature_name == "Bryce Kirklen"
        assert req.signature_svg == "<svg>mock_sig</svg>"
        assert req.agreed_scope is True
        assert req.agreed_milestones is True
        assert req.agreed_refund is True
        assert req.agreed_disclosures is True
        assert req.agreed_cancellation is True

    def test_signature_data_fallback(self):
        req = PublicSignContractRequest(
            client_initials="BK",
            signature_name="Bryce Kirklen",
            signature_type="typed",
            signature_data="data:image/png;base64,iVBORw0KGgo...",
            agreed_scope=True,
            agreed_milestones=True,
            agreed_refund=True,
            agreed_disclosures=True,
            agreed_cancellation=True,
        )
        assert req.signature_data.startswith("data:image/png")
        assert req.signer_name == "Bryce Kirklen"

    @pytest.mark.parametrize("missing_flag", [
        "agreed_scope",
        "agreed_milestones",
        "agreed_refund",
        "agreed_disclosures",
        "agreed_cancellation",
    ])
    def test_rejection_when_any_statutory_flag_is_false(self, missing_flag):
        payload = {
            "client_initials": "BK",
            "signer_name": "Bryce Kirklen",
            "signature_type": "drawn",
            "signature_data": "data:image/png;base64,abc",
            "agreed_scope": True,
            "agreed_milestones": True,
            "agreed_refund": True,
            "agreed_disclosures": True,
            "agreed_cancellation": True,
        }
        payload[missing_flag] = False

        with pytest.raises(ValidationError) as exc_info:
            PublicSignContractRequest(**payload)

        error_message = str(exc_info.value)
        assert "All California statutory consumer protection disclosures and terms must be acknowledged prior to executing this home improvement contract (CSLB BPC 7159)." in error_message

    def test_rejection_when_signature_is_missing(self):
        with pytest.raises(ValidationError) as exc_info:
            PublicSignContractRequest(
                client_initials="BK",
                signer_name="Bryce Kirklen",
                signature_type="typed",
                signature_svg=None,
                signature_data=None,
                agreed_scope=True,
                agreed_milestones=True,
                agreed_refund=True,
                agreed_disclosures=True,
                agreed_cancellation=True,
            )
        assert "A valid signature ('signature_svg' or 'signature_data') is required." in str(exc_info.value)

    def test_rejection_when_signer_name_is_missing_or_short(self):
        # 1. Short name
        with pytest.raises(ValidationError) as exc_info:
            PublicSignContractRequest(
                client_initials="BK",
                signer_name="A",
                signature_data="valid_sig_data",
                agreed_scope=True,
                agreed_milestones=True,
                agreed_refund=True,
                agreed_disclosures=True,
                agreed_cancellation=True,
            )
        assert "signer_name" in str(exc_info.value).lower() or "at least 2 characters" in str(exc_info.value).lower()

        # 2. Missing name
        with pytest.raises(ValidationError) as exc_info2:
            PublicSignContractRequest(
                client_initials="BK",
                signer_name=None,
                signature_name=None,
                signature_data="valid_sig_data",
                agreed_scope=True,
                agreed_milestones=True,
                agreed_refund=True,
                agreed_disclosures=True,
                agreed_cancellation=True,
            )
        assert "signer name is required" in str(exc_info2.value).lower()


class TestRouterDeduplication:
    """Verifies that duplicate endpoints and router mounts have been eliminated."""

    def test_estimates_router_has_exactly_one_delete_endpoint(self):
        delete_routes = [
            route for route in estimates_router.routes
            if getattr(route, "methods", None) and "DELETE" in route.methods and "/estimates/{estimate_id}" in route.path
        ]
        assert len(delete_routes) == 1, f"Expected exactly 1 DELETE /estimates/{{estimate_id}} route, found {len(delete_routes)}"

    def test_marketing_router_mount(self):
        # Marketing router is mounted with prefix="/api/admin" so the analytics
        # route lands at /api/admin/analytics (not /api/admin/marketing/analytics)
        marketing_mounts = [
            route for route in api_router.routes
            if hasattr(route, "path") and route.path == "/api/admin/analytics"
        ]
        assert len(marketing_mounts) >= 1, "Expected /api/admin/analytics to be mounted for CRM Marketing page"

    def test_no_duplicate_estimator_routes_in_system(self):
        system_estimator_routes = [
            route for route in system_router.routes
            if hasattr(route, "path") and "/estimator" in route.path
        ]
        assert len(system_estimator_routes) == 0, f"Found unexpected duplicate estimator routes in system_router: {system_estimator_routes}"

        # Dedicated estimator router should have the estimator routes
        dedicated_estimator_routes = [
            route for route in estimator_router.routes
            if hasattr(route, "path") and "/estimator" in route.path
        ]
        assert len(dedicated_estimator_routes) >= 2


class TestPydanticSchemasCoverage:
    """Verifies input validation and model behavior for all newly created schemas."""

    def test_estimate_create_normalization(self):
        # Test camelCase input normalization
        est = EstimateCreate(
            customerName="Jane Doe",
            customerPhone="(619) 555-1234",
            customerEmail="jane@example.com",
            customerAddress="123 Ocean View Dr",
            leadId=42,
            roofSquares=28.5,
            roofPitch="5:12",
            stories=2,
            tearoffLayers=2,
            marginPct=35.0,
            financingMonths=72,
        )
        assert est.customer_name == "Jane Doe"
        assert est.customer_phone == "(619) 555-1234"
        assert est.customer_email == "jane@example.com"
        assert est.customer_address == "123 Ocean View Dr"
        assert est.lead_id == 42
        assert est.roof_squares == 28.5
        assert est.roof_pitch == "5:12"
        assert est.stories == 2
        assert est.tearoff_layers == 2
        assert est.margin_pct == 35.0
        assert est.financing_months == 72

    def test_estimate_create_validation_failure_on_missing_customer(self):
        with pytest.raises(ValidationError):
            EstimateCreate(roofSquares=20)

    def test_lead_create_normalization(self):
        lead = LeadCreate(
            fullName="John Smith",
            phone="858-555-9876",
            email="john@example.com",
            address="456 Palm St",
            city="Carlsbad",
            serviceType="Tile Roof Reset",
            roofSqf=3200,
            pitch="6:12",
            stories="2 Story",
            roofType="Concrete Tile",
            estimatedValue=29500.0,
        )
        assert lead.full_name == "John Smith"
        assert lead.service_type == "Tile Roof Reset"
        assert lead.roof_sqf == 3200
        assert lead.roof_pitch == "6:12"
        assert lead.roof_type == "Concrete Tile"
        assert lead.estimated_value == 29500.0

    def test_job_create_normalization(self):
        job = JobCreate(
            customerName="Acme Corp",
            leadId=10,
            contractValue=45000.0,
            crewLead="Carlos",
            crewMembers=["Carlos", "Mario", "Luis"],
            estimatedDays=4,
            scheduledStart="2026-10-15",
        )
        assert job.customer_name == "Acme Corp"
        assert job.lead_id == 10
        assert job.contract_value == 45000.0
        assert job.crew_lead == "Carlos"
        assert len(job.crew_members) == 3
        assert job.estimated_days == 4

    def test_auth_schemas(self):
        req = LoginRequest(email="admin@riseuprac.com", password="SecurePassword123!")
        assert req.email == "admin@riseuprac.com"
        assert req.password == "SecurePassword123!"

        token = TokenResponse(token="sess_token_abc123")
        assert token.token == "sess_token_abc123"
        assert token.token_type == "bearer"

        user = UserProfileResponse(
            id=1,
            name="Edith Guerrero",
            email="edith@riseuprac.com",
            role="owner",
            is_protected_owner=True,
            permissions={"*": "all"},
        )
        assert user.role == "owner"
        assert user.is_protected_owner is True

        resp = LoginResponse(ok=True, token="token_xyz", user=user)
        assert resp.ok is True
        assert resp.token == "token_xyz"


class TestPublicContractEndpoint:
    """Verifies that public contract endpoint returns clean 404s and no mock fallbacks."""

    @pytest.mark.asyncio
    async def test_get_public_contract_short_token_raises_404(self):
        from unittest.mock import AsyncMock
        from app.api.public.contracts import get_public_contract

        mock_db = AsyncMock()
        with pytest.raises(HTTPException) as exc_info:
            await get_public_contract(token="short", db=mock_db)
        assert exc_info.value.status_code == 404
        assert "not found" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_get_public_contract_not_found_in_db_raises_404(self):
        from unittest.mock import AsyncMock, MagicMock
        from app.api.public.contracts import get_public_contract

        mock_db = AsyncMock()
        # Simulate no row returned
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        with pytest.raises(HTTPException) as exc_info:
            await get_public_contract(token="valid_length_token_12345", db=mock_db)
        assert exc_info.value.status_code == 404
        assert "not found or signing link has expired" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_sign_public_contract_not_found_raises_404(self):
        from unittest.mock import AsyncMock, MagicMock
        from app.api.public.contracts import sign_public_contract

        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.first.return_value = None
        mock_db.execute.return_value = mock_result

        payload = PublicSignContractRequest(
            client_initials="BK",
            signer_name="Bryce Kirklen",
            signature_type="drawn",
            signature_svg="<svg></svg>",
            agreed_scope=True,
            agreed_milestones=True,
            agreed_refund=True,
            agreed_disclosures=True,
            agreed_cancellation=True,
        )

        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"

        with pytest.raises(HTTPException) as exc_info:
            await sign_public_contract(
                token="valid_length_token_12345",
                payload=payload,
                request=mock_request,
                db=mock_db,
            )
        assert exc_info.value.status_code == 404


class TestResponseSchemas:
    """Verifies typed response models serialize and validate successfully."""

    def test_contract_response_schema(self):
        contract = ContractResponse(
            id=101,
            contract_number="RU-2026-00101",
            lead_id=5,
            status="client_signed",
            signing_token="token_abc_123",
            client_initials="BK",
            signature_name="Bryce Kirklen",
            contract_data={"agreed_scope": True, "compliance_reference": "CSLB BPC 7159"},
        )
        assert contract.id == 101
        assert contract.status == "client_signed"
        assert contract.contract_data["agreed_scope"] is True

    def test_job_response_schema(self):
        job = JobResponse(
            id=50,
            job_number="JOB-2026-0050",
            status="permit_pending",
            customer_name="Alice Wonderland",
            contract_value=32500.0,
            estimated_days=3,
        )
        assert job.id == 50
        assert job.job_number == "JOB-2026-0050"
        assert job.contract_value == 32500.0

    def test_lead_response_schema(self):
        lead = LeadResponse(
            id=20,
            full_name="Bob Builder",
            status="new",
            priority="hot",
            lead_score=85,
            pipeline_stage="stage_1_lead_gen",
        )
        assert lead.id == 20
        assert lead.lead_score == 85

    def test_estimate_response_schema(self):
        est = EstimateResponse(
            id=30,
            estimate_number="EST-2026-0030",
            version=1,
            status="draft",
            customer_name="Charlie Brown",
            service_type="Residential Roofing",
            roof_squares=22.0,
            roof_pitch="4:12",
            stories=1,
            tearoff_layers=1,
            material_type="Owens Corning Duration",
            total=14500.0,
            financing_months=60,
        )
        assert est.id == 30
        assert est.total == 14500.0

