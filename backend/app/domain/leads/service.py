from __future__ import annotations

from typing import Any, Optional
from app.core.authz import Principal, ensure_owns
from app.core.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.core.uow import UnitOfWork
from app.domain.leads.repository import LeadRepository
from app.domain.leads.schemas import (
    LeadActivityCreatePayload,
    LeadCreatePayload,
    LeadUpdatePayload,
)
from app.services.scoring import calculate_lead_score
from app.services.sync import find_or_create_client, normalize_phone, parse_address_components
from app.shared.activity import log_activity


class LeadService:
    """Implements all business domain logic, validation, and workflow rules for Leads."""

    def __init__(self, uow: UnitOfWork) -> None:
        self.uow = uow
        self.repo = LeadRepository()

    async def get_lead(self, principal: Principal, lead_id: int) -> dict[str, Any]:
        lead = await self.repo.get_by_id(self.uow, lead_id)
        if not lead:
            raise NotFound(f"Lead #{lead_id} not found")
        ensure_owns(principal, lead, "leads.view")
        return lead

    async def create_lead(self, principal: Principal, payload: LeadCreatePayload) -> dict[str, Any]:
        data = payload.model_dump(exclude_unset=True)

        full_name = data.get("full_name", "").strip()
        if not full_name:
            raise ValidationFailed("Full name is required to create a lead.")

        phone = normalize_phone(data.get("phone"))
        addr = parse_address_components(data.get("address"), data.get("city"), data.get("zip"))

        score = calculate_lead_score(
            service_type=data.get("service_type"),
            roof_sqf=data.get("roof_sqf"),
            roof_pitch=data.get("roof_pitch"),
            stories=data.get("stories"),
            notes=data.get("notes"),
        )

        assigned_to = payload.canonical_assigned_to()
        source = payload.canonical_source() or "direct_intake"

        insert_values: dict[str, Any] = {
            "full_name": full_name,
            "phone": phone,
            "email": data.get("email"),
            "address": addr["address"],
            "city": addr["city"],
            "zip": addr["zip"],
            "service_type": data.get("service_type") or "Residential Roofing",
            "notes": data.get("notes"),
            "status": "new",
            "priority": data.get("priority") or "medium",
            "pipeline_stage": data.get("pipeline_stage") or "stage_1_lead_gen",
            "assigned_to_user_id": assigned_to,
            "lead_source": source,
            "source_type": source,
            "roof_sqf": data.get("roof_sqf"),
            "roof_squares": data.get("roof_squares"),
            "roof_pitch": data.get("roof_pitch"),
            "stories": data.get("stories"),
            "roof_type": data.get("roof_type"),
            "estimated_value": data.get("estimated_value"),
            "lead_score": score,
            "created_by_user_id": principal.id,
            "created_by": principal.id,
        }

        # Resolve or link Client record
        client_id = await find_or_create_client(
            self.uow.session,
            full_name=full_name,
            phone=phone,
            email=data.get("email"),
            address=addr["address"],
            city=addr["city"],
            zip_code=addr["zip"],
            category="lead",
        )
        if client_id:
            insert_values["client_id"] = client_id

        lead = await self.repo.create_lead(self.uow, insert_values)

        # Log creation activity with verified actor
        await log_activity(
            uow=self.uow,
            entity_type="lead",
            entity_id=lead["id"],
            action="created",
            actor=principal,
            client_id=client_id,
            title="Lead Created",
            description=f"Lead created via CRM intake by {principal.name or 'Staff'}.",
        )

        return lead

    async def update_lead(
        self,
        principal: Principal,
        lead_id: int,
        payload: LeadUpdatePayload,
    ) -> dict[str, Any]:
        target = await self.repo.get_by_id(self.uow, lead_id)
        if not target:
            raise NotFound(f"Lead #{lead_id} not found")
        ensure_owns(principal, target, "leads.edit")

        changes = payload.model_dump(exclude_unset=True)

        # Unclaimed lead rule guard
        is_unclaimed = target.get("assigned_to_user_id") is None
        new_assignee = payload.canonical_assigned_to()
        if is_unclaimed and not new_assignee:
            if "pipeline_stage" in changes and changes["pipeline_stage"] not in (
                "cold_lead",
                "stage_1_lead_gen",
                "new_leads",
            ):
                raise ValidationFailed("Please claim the lead first before advancing its stage.")
            if "status" in changes and changes["status"] not in ("new",):
                raise ValidationFailed("Please claim the lead first before advancing its stage.")

        # Canonicalize assignee
        if new_assignee is not None:
            changes["assigned_to_user_id"] = new_assignee
            changes["assigned_to"] = new_assignee

        # Address component normalization
        if any(k in changes for k in ["address", "city", "zip"]):
            addr = parse_address_components(
                changes.get("address", target.get("address")),
                changes.get("city", target.get("city")),
                changes.get("zip", target.get("zip")),
            )
            if "address" in changes:
                changes["address"] = addr["address"]
            if "city" in changes:
                changes["city"] = addr["city"]
            if "zip" in changes:
                changes["zip"] = addr["zip"]

        updated = await self.repo.update_lead(self.uow, lead_id, changes)
        assert updated is not None

        # Log activity on significant transitions
        if "pipeline_stage" in changes and changes["pipeline_stage"] != target.get("pipeline_stage"):
            await log_activity(
                uow=self.uow,
                entity_type="lead",
                entity_id=lead_id,
                action="stage_changed",
                actor=principal,
                client_id=target.get("client_id"),
                title="Stage Transition",
                description=f"Stage moved from {target.get('pipeline_stage')} to {changes['pipeline_stage']}.",
            )

        return updated

    async def delete_lead(self, principal: Principal, lead_id: int) -> bool:
        target = await self.repo.get_by_id(self.uow, lead_id)
        if not target:
            raise NotFound(f"Lead #{lead_id} not found")
        ensure_owns(principal, target, "leads.delete")
        return await self.repo.delete_lead(self.uow, lead_id)

    async def get_activities(self, principal: Principal, lead_id: int) -> list[dict[str, Any]]:
        target = await self.repo.get_by_id(self.uow, lead_id)
        if not target:
            raise NotFound(f"Lead #{lead_id} not found")
        ensure_owns(principal, target, "leads.view")
        return list(await self.repo.get_activities(self.uow, lead_id))

    async def add_activity(
        self,
        principal: Principal,
        lead_id: int,
        payload: LeadActivityCreatePayload,
    ) -> dict[str, Any]:
        target = await self.repo.get_by_id(self.uow, lead_id)
        if not target:
            raise NotFound(f"Lead #{lead_id} not found")
        ensure_owns(principal, target, "leads.edit")

        action = payload.canonical_activity_type()
        row = await log_activity(
            uow=self.uow,
            entity_type="lead",
            entity_id=lead_id,
            action=action,
            actor=principal,
            client_id=target.get("client_id"),
            title=payload.title,
            description=payload.description,
        )
        return row
