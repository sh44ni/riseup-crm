from __future__ import annotations

import json
from typing import Any, Optional, Sequence
from sqlalchemy import text

from app.core.uow import UnitOfWork
from app.shared.partial_update import build_update

ALLOWED_LEAD_UPDATE_COLUMNS: list[str] = [
    "full_name",
    "phone",
    "email",
    "address",
    "city",
    "zip",
    "service_type",
    "notes",
    "status",
    "priority",
    "pipeline_stage",
    "assigned_to_user_id",
    "lost_reason",
    "lost_notes",
    "lost_at",
    "roof_sqf",
    "roof_squares",
    "roof_pitch",
    "stories",
    "roof_type",
    "estimated_value",
    "site_visit_scheduled_at",
    "site_visit_completed_at",
    "lead_score",
]


class LeadRepository:
    """Encapsulates all SQL persistence for the Leads domain."""

    @staticmethod
    async def get_by_id(uow: UnitOfWork, lead_id: int) -> Optional[dict[str, Any]]:
        sql = text("""
            SELECT l.*,
                   u.name AS assigned_to_name,
                   u.email AS assigned_to_email,
                   u_creator.name AS created_by_name,
                   c.client_category,
                   c.status AS client_status,
                   c.total_jobs_count,
                   c.total_revenue AS client_total_revenue,
                   c.address AS client_360_address,
                   c.city AS client_360_city,
                   c.zip AS client_360_zip,
                   j.contract_value AS job_contract_value,
                   e.id AS estimate_id, e.estimate_number, e.total AS estimate_total,
                   e.template_key AS estimate_template_key, e.status AS estimate_status,
                   cnt.id AS contract_id, cnt.contract_number, cnt.status AS contract_status,
                   cnt.contract_data
            FROM leads l
            LEFT JOIN users u ON l.assigned_to_user_id = u.id
            LEFT JOIN users u_creator ON l.created_by_user_id = u_creator.id
            LEFT JOIN clients c ON l.client_id = c.id
            LEFT JOIN LATERAL (
                SELECT id, job_number, status, contract_value
                FROM jobs
                WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
                ORDER BY id DESC LIMIT 1
            ) j ON true
            LEFT JOIN LATERAL (
                SELECT id, estimate_number, total, status, template_key
                FROM estimates
                WHERE lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id)
                ORDER BY id DESC LIMIT 1
            ) e ON true
            LEFT JOIN LATERAL (
                SELECT id, contract_number, status, contract_data
                FROM contracts
                WHERE (lead_id = l.id OR (l.client_id IS NOT NULL AND client_id = l.client_id))
                  AND is_archived = false
                ORDER BY
                    CASE
                        WHEN status = 'signed' THEN 1
                        WHEN status = 'client_signed' THEN 2
                        WHEN status = 'sent' THEN 3
                        ELSE 4
                    END,
                    id DESC
                LIMIT 1
            ) cnt ON true
            WHERE l.id = :id
        """)
        row = (await uow.session.execute(sql, {"id": lead_id})).mappings().first()
        if not row:
            return None
        res_dict = dict(row)
        LeadRepository._enrich_lead_metrics(res_dict)
        return res_dict

    @staticmethod
    def _enrich_lead_metrics(lead_dict: dict[str, Any]) -> None:
        contract_val = float(lead_dict.get("job_contract_value") or 0.0)
        if contract_val <= 0 and lead_dict.get("contract_data"):
            cd = lead_dict.get("contract_data")
            if isinstance(cd, str):
                try:
                    cd = json.loads(cd)
                except (json.JSONDecodeError, ValueError, TypeError):
                    cd = {}
            if isinstance(cd, dict):
                raw_cprice = cd.get("contractPrice") or cd.get("contract_price") or cd.get("total")
                if raw_cprice:
                    try:
                        clean_c = float(str(raw_cprice).replace("$", "").replace(",", "").strip())
                        if clean_c > 0:
                            contract_val = clean_c
                    except (ValueError, TypeError):
                        pass
        lead_dict["contract_value"] = contract_val if contract_val > 0 else None

        tmpl_key = lead_dict.get("estimate_template_key")
        is_up = bool(tmpl_key == "uploaded")
        raw_et = float(lead_dict.get("estimate_total") or 0.0)
        lead_dict["estimate_total"] = None if (is_up or raw_et <= 0) else raw_et
        lead_dict["is_uploaded_estimate"] = is_up

    @staticmethod
    async def create_lead(uow: UnitOfWork, values: dict[str, Any]) -> dict[str, Any]:
        columns = list(values.keys())
        placeholders = [f":{c}" for c in columns]
        sql = text(f"""
            INSERT INTO leads ({', '.join(columns)}, created_at, updated_at)
            VALUES ({', '.join(placeholders)}, NOW(), NOW())
            RETURNING *
        """)
        result = await uow.session.execute(sql, values)
        row = result.mappings().first()
        assert row is not None
        return dict(row)

    @staticmethod
    async def update_lead(uow: UnitOfWork, lead_id: int, changes: dict[str, Any]) -> Optional[dict[str, Any]]:
        stmt, params = build_update(
            table_name="leads",
            allowed_columns=ALLOWED_LEAD_UPDATE_COLUMNS,
            changes=changes,
            where_clause="id = :id",
            where_params={"id": lead_id},
            include_updated_at=True,
            returning="*",
        )
        if stmt is None:
            return await LeadRepository.get_by_id(uow, lead_id)
        result = await uow.session.execute(stmt, params)
        row = result.mappings().first()
        return dict(row) if row else None

    @staticmethod
    async def delete_lead(uow: UnitOfWork, lead_id: int) -> bool:
        # Physical or soft delete
        sql = text("DELETE FROM leads WHERE id = :id RETURNING id")
        result = await uow.session.execute(sql, {"id": lead_id})
        return result.scalar() is not None

    @staticmethod
    async def get_activities(uow: UnitOfWork, lead_id: int) -> Sequence[dict[str, Any]]:
        sql = text("""
            SELECT * FROM activities
            WHERE entity_type = 'lead' AND entity_id = :lead_id
            ORDER BY created_at DESC
        """)
        rows = (await uow.session.execute(sql, {"lead_id": lead_id})).mappings().all()
        return [dict(r) for r in rows]
