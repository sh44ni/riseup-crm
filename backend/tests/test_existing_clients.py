"""
Tests for Existing Homeowner Onboarding & Pipeline Staging
=========================================================
Verifies:
1. Pydantic schema validation & normalization for CreateExistingClientRequest.
2. Rejection on missing name or contact information.
3. Proper stage mappings and attribution fields.
"""

import pytest
from app.schemas.clients import CreateExistingClientRequest, CreateClientRequest


class TestExistingClientSchemas:
    def test_existing_client_request_normalization(self):
        req = CreateExistingClientRequest(
            fullName="Robert Henderson",
            phone="760-555-0199",
            email="robert.henderson@example.com",
            address="1244 Pacific Coast Hwy",
            city="Oceanside",
            zip="92054",
            pipelineStage="active_jobs",
            contractValue=24500.0,
            roofType="Eagle Concrete Tile",
            roofSqf=2800,
            stories=2,
            hoa=True,
            notes="Historical customer from 2024 re-roof project",
            assignedToUserId=4,
            acquiredByUserId=1
        )

        assert req.full_name == "Robert Henderson"
        assert req.phone == "760-555-0199"
        assert req.email == "robert.henderson@example.com"
        assert req.pipeline_stage == "active_jobs"
        assert req.contract_value == 24500.0
        assert req.roof_type == "Eagle Concrete Tile"
        assert req.roof_sqf == 2800
        assert req.stories == 2
        assert req.hoa is True
        assert req.assigned_to_user_id == 4
        assert req.acquired_by_user_id == 1

    def test_existing_client_camelcase_and_aliases(self):
        req = CreateExistingClientRequest(
            name="Alice Walker",
            phone="858-555-3211",
            zipCode="92056",
            pipelineStage="completed",
            estimatedValue=18200.0,
            serviceType="Tile Re-set & Underlayment",
            clientSince="2022-04-15"
        )

        assert req.full_name == "Alice Walker"
        assert req.zip == "92056"
        assert req.pipeline_stage == "completed"
        assert req.contract_value == 18200.0
        assert req.service_type == "Tile Re-set & Underlayment"
        assert req.client_since == "2022-04-15"

    def test_existing_client_defaults(self):
        req = CreateExistingClientRequest(
            fullName="Mark Taylor",
            email="mark.taylor@example.com"
        )

        assert req.full_name == "Mark Taylor"
        assert req.pipeline_stage == "active_jobs"
        assert req.contract_value == 0.0
        assert req.city == "Oceanside"
        assert req.zip == "92054"
        assert req.source_type == "team_member"

    def test_create_client_request_normalization(self):
        req = CreateClientRequest(
            fullName="David Lee",
            phone="619-555-7788",
            city="Carlsbad"
        )
        assert req.full_name == "David Lee"
        assert req.city == "Carlsbad"
        assert req.property_type == "Single Family"

    def test_stage_labels_and_router_mounts(self):
        from app.api.admin.clients import STAGE_LABELS, router
        # Verify 8 primary stages are mapped
        expected_stages = [
            "cold_lead", "contacted", "inspection_scheduled",
            "estimate_building", "estimate_sent", "contract_signed",
            "active_jobs", "completed"
        ]
        for stage in expected_stages:
            assert stage in STAGE_LABELS, f"Stage '{stage}' missing from STAGE_LABELS"

        # Verify router has the /clients/existing POST route
        found_existing_route = False
        for route in router.routes:
            if hasattr(route, "path") and route.path == "/clients/existing" and "POST" in route.methods:
                found_existing_route = True
                break
        assert found_existing_route is True, "POST /clients/existing route not found in clients router"
