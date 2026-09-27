"""Baseline initial database schema

Revision ID: 0001
Revises: 
Create Date: 2026-09-25 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    def table_has_index(tname: str, iname: str) -> bool:
        if tname not in existing_tables:
            return False
        return iname in [idx["name"] for idx in insp.get_indexes(tname)]

    # 1. users
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("email", sa.Text(), nullable=False),
            sa.Column("phone", sa.Text(), nullable=True),
            sa.Column("password_hash", sa.Text(), nullable=False),
            sa.Column("salt", sa.Text(), nullable=False),
            sa.Column("role", sa.Text(), nullable=False),
            sa.Column("status", sa.Text(), server_default="active", nullable=False),
            sa.Column("avatar_url", sa.Text(), nullable=True),
            sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("permissions", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("signature_data", sa.Text(), nullable=True),
            sa.Column("signature_type", sa.Text(), server_default="typed", nullable=True),
            sa.Column("signature_title", sa.Text(), server_default="Project Manager", nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)
        op.create_index("idx_users_role_status", "users", ["role", "status"])

    # 2. roles
    if "roles" not in existing_tables:
        op.create_table(
            "roles",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_protected", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("is_authorized_signatory", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )
        op.create_index("ix_roles_created_by", "roles", ["created_by"])

    # 3. permissions
    if "permissions" not in existing_tables:
        op.create_table(
            "permissions",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("key", sa.Text(), nullable=False),
            sa.Column("resource", sa.Text(), nullable=False),
            sa.Column("action", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("key"),
        )

    # 4. role_permissions
    if "role_permissions" not in existing_tables:
        op.create_table(
            "role_permissions",
            sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("permission_id", sa.Integer(), sa.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("scope", sa.Text(), server_default="all", nullable=False),
        )

    # 5. user_roles
    if "user_roles" not in existing_tables:
        op.create_table(
            "user_roles",
            sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("assigned_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])
        op.create_index("ix_user_roles_assigned_by", "user_roles", ["assigned_by"])

    # 6. invitations
    if "invitations" not in existing_tables:
        op.create_table(
            "invitations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("email", sa.Text(), nullable=False),
            sa.Column("invited_role_ids", postgresql.ARRAY(sa.Integer()), nullable=False),
            sa.Column("invited_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("token", sa.Text(), nullable=False),
            sa.Column("status", sa.Text(), server_default="pending", nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token"),
        )
        op.create_index("ix_invitations_token", "invitations", ["token"], unique=True)
        op.create_index("ix_invitations_invited_by", "invitations", ["invited_by"])

    # 7. admin_sessions
    if "admin_sessions" not in existing_tables:
        op.create_table(
            "admin_sessions",
            sa.Column("token", sa.Text(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_admin_sessions_user_id", "admin_sessions", ["user_id"])
        op.create_index("ix_admin_sessions_expires_at", "admin_sessions", ["expires_at"])

    # 8. clients
    if "clients" not in existing_tables:
        op.create_table(
            "clients",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("full_name", sa.Text(), nullable=False),
            sa.Column("phone", sa.Text(), nullable=True),
            sa.Column("phone_normalized", sa.Text(), nullable=True),
            sa.Column("email", sa.Text(), nullable=True),
            sa.Column("secondary_phone", sa.Text(), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("zip", sa.Text(), nullable=True),
            sa.Column("property_type", sa.Text(), server_default="Single Family", nullable=False),
            sa.Column("roof_type", sa.Text(), nullable=True),
            sa.Column("roof_sqf", sa.Integer(), nullable=True),
            sa.Column("roof_age", sa.Integer(), nullable=True),
            sa.Column("stories", sa.Integer(), server_default="1", nullable=False),
            sa.Column("hoa", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("status", sa.Text(), server_default="lead", nullable=False),
            sa.Column("client_category", sa.Text(), server_default="lead", nullable=False),
            sa.Column("lost_reason", sa.Text(), nullable=True),
            sa.Column("tags", postgresql.ARRAY(sa.Text()), server_default='{"New Lead"}', nullable=False),
            sa.Column("total_revenue", sa.Numeric(10, 2), server_default="0.00", nullable=False),
            sa.Column("total_jobs_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("assigned_to_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("source_type", sa.Text(), server_default="website", nullable=False),
            sa.Column("acquired_by_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("lead_source_detail", sa.Text(), nullable=True),
            sa.Column("client_since", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_clients_full_name", "clients", ["full_name"])
        op.create_index("ix_clients_phone", "clients", ["phone"])
        op.create_index("ix_clients_phone_normalized", "clients", ["phone_normalized"])
        op.create_index("ix_clients_email", "clients", ["email"], unique=True)
        op.create_index("ix_clients_status", "clients", ["status"])
        op.create_index("ix_clients_client_category", "clients", ["client_category"])
        op.create_index("ix_clients_created_at", "clients", ["created_at"])
        op.create_index("ix_clients_assigned_to_user_id", "clients", ["assigned_to_user_id"])
        op.create_index("ix_clients_acquired_by_user_id", "clients", ["acquired_by_user_id"])
        op.create_index("idx_clients_lower_email", "clients", [sa.text("lower(email)")])
        op.create_index("idx_clients_email_phone", "clients", ["email", "phone"])

    # 9. client_documents
    if "client_documents" not in existing_tables:
        op.create_table(
            "client_documents",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=True),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("file_url", sa.Text(), nullable=True),
            sa.Column("file_type", sa.Text(), server_default="document", nullable=True),
            sa.Column("file_size", sa.Text(), nullable=True),
            sa.Column("uploaded_by", sa.Text(), nullable=True),
            sa.Column("doc_type", sa.Text(), nullable=True),
            sa.Column("url", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_client_documents_client_id", "client_documents", ["client_id"])

    # 10. leads
    if "leads" not in existing_tables:
        op.create_table(
            "leads",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("form_type", sa.Text(), nullable=False),
            sa.Column("full_name", sa.Text(), nullable=False),
            sa.Column("phone", sa.Text(), nullable=True),
            sa.Column("email", sa.Text(), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("zip", sa.Text(), nullable=True),
            sa.Column("service_type", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("subject", sa.Text(), nullable=True),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("source_page", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="new", nullable=False),
            sa.Column("priority", sa.Text(), server_default="cool", nullable=False),
            sa.Column("lead_score", sa.Integer(), server_default="0", nullable=False),
            sa.Column("lead_source", sa.Text(), server_default="website", nullable=True),
            sa.Column("source_type", sa.Text(), server_default="website", nullable=False),
            sa.Column("lead_source_detail", sa.Text(), nullable=True),
            sa.Column("pipeline_stage", sa.Text(), server_default="stage_1_lead_gen", nullable=False),
            sa.Column("stage_entered_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("initial_contacted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("site_visit_scheduled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("site_visit_completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("proposal_sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("contract_signed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("job_completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_contact_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("roof_sqf", sa.Integer(), nullable=True),
            sa.Column("roof_squares", sa.Numeric(6, 1), nullable=True),
            sa.Column("roof_pitch", sa.Text(), nullable=True),
            sa.Column("stories", sa.Integer(), server_default="1", nullable=False),
            sa.Column("roof_type", sa.Text(), nullable=True),
            sa.Column("assigned_to_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("assigned_to", sa.Text(), nullable=True),
            sa.Column("assigned_by_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_by_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by_role_snapshot", sa.Text(), nullable=True),
            sa.Column("address_confirmed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("discount_applied", sa.Text(), nullable=True),
            sa.Column("financing_interested", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("estimated_value", sa.Numeric(10, 2), server_default="0.00", nullable=False),
            sa.Column("lost_reason", sa.Text(), nullable=True),
            sa.Column("lost_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("lost_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_leads_client_id", "leads", ["client_id"])
        op.create_index("ix_leads_status", "leads", ["status"])
        op.create_index("ix_leads_source_type", "leads", ["source_type"])
        op.create_index("ix_leads_created_at", "leads", ["created_at"])
        op.create_index("ix_leads_assigned_to_user_id", "leads", ["assigned_to_user_id"])
        op.create_index("ix_leads_assigned_by_user_id", "leads", ["assigned_by_user_id"])
        op.create_index("ix_leads_created_by_user_id", "leads", ["created_by_user_id"])
        op.create_index("ix_leads_created_by", "leads", ["created_by"])
        op.create_index("idx_leads_pipeline_stage_entered", "leads", ["pipeline_stage", "stage_entered_at"])
        op.create_index("idx_leads_assigned_stage", "leads", ["assigned_to_user_id", "pipeline_stage"])
        op.create_index("idx_leads_status_created_at", "leads", ["status", "created_at"])
        op.create_index("idx_leads_status_source_type", "leads", ["status", "source_type"])

    # 11. lead_stage_checklists
    if "lead_stage_checklists" not in existing_tables:
        op.create_table(
            "lead_stage_checklists",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
            sa.Column("stage", sa.Text(), nullable=False),
            sa.Column("item_key", sa.Text(), nullable=False),
            sa.Column("completed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("completed_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("lead_id", "stage", "item_key", name="unique_lead_stage_checklist_item"),
        )
        op.create_index("ix_lead_stage_checklists_lead_id", "lead_stage_checklists", ["lead_id"])
        op.create_index("ix_lead_stage_checklists_completed_by", "lead_stage_checklists", ["completed_by"])
        op.create_index("idx_lead_stage_checklists_lead_stage", "lead_stage_checklists", ["lead_id", "stage"])

    # 12. activities
    if "activities" not in existing_tables:
        op.create_table(
            "activities",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("entity_type", sa.Text(), nullable=False),
            sa.Column("entity_id", sa.BigInteger(), nullable=False),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("activity_type", sa.Text(), nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("performed_by", sa.Text(), nullable=True),
            sa.Column("call_duration", sa.Integer(), nullable=True),
            sa.Column("metadata", postgresql.JSONB(), nullable=True),
            sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("user_name", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_activities_client_id", "activities", ["client_id"])
        op.create_index("ix_activities_user_id", "activities", ["user_id"])
        op.create_index("ix_activities_created_at", "activities", ["created_at"])
        op.create_index("idx_activities_entity_type_id", "activities", ["entity_type", "entity_id", "created_at"])

    # 13. tasks
    if "tasks" not in existing_tables:
        op.create_table(
            "tasks",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("entity_type", sa.Text(), nullable=True),
            sa.Column("entity_id", sa.BigInteger(), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("assigned_to", sa.Text(), nullable=True),
            sa.Column("assigned_to_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("event_type", sa.Text(), server_default="task", nullable=False),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("priority", sa.Text(), server_default="normal", nullable=False),
            sa.Column("work_category", sa.Text(), server_default="Rise Up", nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_tasks_client_id", "tasks", ["client_id"])
        op.create_index("ix_tasks_assigned_to_user_id", "tasks", ["assigned_to_user_id"])
        op.create_index("ix_tasks_created_by_user_id", "tasks", ["created_by_user_id"])
        op.create_index("idx_tasks_due_completed", "tasks", ["due_at", "completed_at"])

    # 14. estimates
    if "estimates" not in existing_tables:
        op.create_table(
            "estimates",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), nullable=True),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("estimate_number", sa.Text(), nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("status", sa.Text(), server_default="draft", nullable=False),
            sa.Column("customer_name", sa.Text(), nullable=False),
            sa.Column("customer_phone", sa.Text(), nullable=True),
            sa.Column("customer_email", sa.Text(), nullable=True),
            sa.Column("customer_address", sa.Text(), nullable=True),
            sa.Column("customer_city", sa.Text(), nullable=True),
            sa.Column("customer_zip", sa.Text(), nullable=True),
            sa.Column("service_type", sa.Text(), nullable=False),
            sa.Column("roof_squares", sa.Numeric(6, 2), nullable=False),
            sa.Column("roof_pitch", sa.Text(), server_default="4:12", nullable=False),
            sa.Column("stories", sa.Integer(), server_default="1", nullable=False),
            sa.Column("tearoff_layers", sa.Integer(), server_default="1", nullable=False),
            sa.Column("material_type", sa.Text(), nullable=False),
            sa.Column("material_cost", sa.Numeric(10, 2), nullable=False),
            sa.Column("labor_cost", sa.Numeric(10, 2), nullable=False),
            sa.Column("addons", postgresql.JSONB(), server_default='[]', nullable=True),
            sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
            sa.Column("margin_pct", sa.Numeric(5, 2), server_default="30.00", nullable=False),
            sa.Column("total", sa.Numeric(10, 2), nullable=False),
            sa.Column("financing_months", sa.Integer(), server_default="60", nullable=False),
            sa.Column("monthly_payment", sa.Numeric(10, 2), nullable=True),
            sa.Column("valid_until", sa.Date(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("template_key", sa.Text(), server_default="multi_option_proposal", nullable=True),
            sa.Column("proposal_data", postgresql.JSONB(), nullable=True),
            sa.Column("pdf_url", sa.Text(), nullable=True),
            sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("signature_name", sa.Text(), nullable=True),
            sa.Column("signature_data", sa.Text(), nullable=True),
            sa.Column("access_token", sa.Text(), nullable=True),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by_role_snapshot", sa.Text(), nullable=True),
            sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("estimate_number"),
        )
        op.create_index("ix_estimates_job_id", "estimates", ["job_id"])
        op.create_index("ix_estimates_lead_id", "estimates", ["lead_id"])
        op.create_index("ix_estimates_client_id", "estimates", ["client_id"])
        op.create_index("ix_estimates_estimate_number", "estimates", ["estimate_number"], unique=True)
        op.create_index("ix_estimates_status", "estimates", ["status"])
        op.create_index("ix_estimates_access_token", "estimates", ["access_token"], unique=True)
        op.create_index("ix_estimates_created_by", "estimates", ["created_by"])
        op.create_index("ix_estimates_is_archived", "estimates", ["is_archived"])
        op.create_index("ix_estimates_created_at", "estimates", ["created_at"])
        op.create_index("idx_estimates_created_status", "estimates", ["created_at", "status"])
        op.create_index("idx_estimates_status_created", "estimates", ["status", "created_at"])

    # 15. jobs
    if "jobs" not in existing_tables:
        op.create_table(
            "jobs",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("estimate_id", sa.BigInteger(), sa.ForeignKey("estimates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("job_number", sa.Text(), nullable=False),
            sa.Column("status", sa.Text(), server_default="permit_pending", nullable=False),
            sa.Column("customer_name", sa.Text(), nullable=False),
            sa.Column("customer_phone", sa.Text(), nullable=True),
            sa.Column("customer_email", sa.Text(), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("zip", sa.Text(), nullable=True),
            sa.Column("service_type", sa.Text(), nullable=True),
            sa.Column("contract_value", sa.Numeric(10, 2), nullable=False),
            sa.Column("permit_status", sa.Text(), server_default="not_filed", nullable=False),
            sa.Column("permit_number", sa.Text(), nullable=True),
            sa.Column("permit_filed_at", sa.Date(), nullable=True),
            sa.Column("permit_approved_at", sa.Date(), nullable=True),
            sa.Column("material_status", sa.Text(), server_default="not_ordered", nullable=False),
            sa.Column("material_ordered_at", sa.Date(), nullable=True),
            sa.Column("material_delivered_at", sa.Date(), nullable=True),
            sa.Column("crew_lead", sa.Text(), nullable=True),
            sa.Column("crew_members", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("scheduled_start", sa.Date(), nullable=True),
            sa.Column("estimated_days", sa.Integer(), server_default="3", nullable=False),
            sa.Column("actual_start", sa.Date(), nullable=True),
            sa.Column("actual_end", sa.Date(), nullable=True),
            sa.Column("weather_delays", sa.Integer(), server_default="0", nullable=False),
            sa.Column("milestones", postgresql.JSONB(), server_default='[]', nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("project_manager_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("foreman_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by_role_snapshot", sa.Text(), nullable=True),
            sa.Column("assigned_to", sa.Text(), nullable=True),
            sa.Column("assigned_to_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("stage", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("job_number"),
        )
        op.create_index("ix_jobs_lead_id", "jobs", ["lead_id"])
        op.create_index("ix_jobs_client_id", "jobs", ["client_id"])
        op.create_index("ix_jobs_estimate_id", "jobs", ["estimate_id"])
        op.create_index("ix_jobs_job_number", "jobs", ["job_number"], unique=True)
        op.create_index("ix_jobs_status", "jobs", ["status"])
        op.create_index("ix_jobs_project_manager_id", "jobs", ["project_manager_id"])
        op.create_index("ix_jobs_foreman_id", "jobs", ["foreman_id"])
        op.create_index("ix_jobs_created_by", "jobs", ["created_by"])
        op.create_index("ix_jobs_assigned_to", "jobs", ["assigned_to"])
        op.create_index("ix_jobs_assigned_to_user_id", "jobs", ["assigned_to_user_id"])
        op.create_index("ix_jobs_stage", "jobs", ["stage"])
        op.create_index("idx_jobs_stage_created_at", "jobs", ["stage", "created_at"])
        op.create_index("idx_jobs_status_created_at", "jobs", ["status", "created_at"])
        op.create_index("idx_jobs_created_at", "jobs", ["created_at"])

    # 16. crew_members
    if "crew_members" not in existing_tables:
        op.create_table(
            "crew_members",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("phone", sa.Text(), nullable=True),
            sa.Column("role", sa.Text(), nullable=False),
            sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("current_job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("skills", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_crew_members_current_job_id", "crew_members", ["current_job_id"])
        op.create_index("idx_crew_active_role", "crew_members", ["active", "role"])

    # 17. job_photos
    if "job_photos" not in existing_tables:
        op.create_table(
            "job_photos",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=True),
            sa.Column("phase", sa.Text(), nullable=False),
            sa.Column("url", sa.Text(), nullable=False),
            sa.Column("caption", sa.Text(), nullable=True),
            sa.Column("uploaded_by", sa.Text(), server_default="Field Crew", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_photos_job_id", "job_photos", ["job_id"])
        op.create_index("ix_job_photos_lead_id", "job_photos", ["lead_id"])
        op.create_index("idx_job_photos_job_phase", "job_photos", ["job_id", "phase"])

    # 18. job_expenses
    if "job_expenses" not in existing_tables:
        op.create_table(
            "job_expenses",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("category", sa.Text(), nullable=False),
            sa.Column("vendor", sa.Text(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("invoice_receipt_number", sa.Text(), nullable=True),
            sa.Column("expense_date", sa.Date(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_expenses_job_id", "job_expenses", ["job_id"])
        op.create_index("ix_job_expenses_category", "job_expenses", ["category"])

    # 19. job_change_orders
    if "job_change_orders" not in existing_tables:
        op.create_table(
            "job_change_orders",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("status", sa.Text(), server_default="pending", nullable=False),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_change_orders_job_id", "job_change_orders", ["job_id"])
        op.create_index("ix_job_change_orders_status", "job_change_orders", ["status"])
        op.create_index("ix_job_change_orders_created_by", "job_change_orders", ["created_by"])

    # 20. job_permits
    if "job_permits" not in existing_tables:
        op.create_table(
            "job_permits",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("permit_number", sa.Text(), nullable=True),
            sa.Column("jurisdiction", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="not_filed", nullable=False),
            sa.Column("filed_at", sa.Date(), nullable=True),
            sa.Column("approved_at", sa.Date(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_permits_job_id", "job_permits", ["job_id"])
        op.create_index("ix_job_permits_permit_number", "job_permits", ["permit_number"])
        op.create_index("ix_job_permits_status", "job_permits", ["status"])

    # 21. job_tasks
    if "job_tasks" not in existing_tables:
        op.create_table(
            "job_tasks",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("completed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("assigned_to", sa.Text(), nullable=True),
            sa.Column("due_date", sa.Date(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_job_tasks_job_id", "job_tasks", ["job_id"])

    # 22. invoices
    if "invoices" not in existing_tables:
        op.create_table(
            "invoices",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("estimate_id", sa.BigInteger(), sa.ForeignKey("estimates.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("invoice_number", sa.Text(), nullable=False),
            sa.Column("milestone_name", sa.Text(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("status", sa.Text(), server_default="pending", nullable=False),
            sa.Column("due_date", sa.Date(), nullable=False),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("payment_method", sa.Text(), nullable=True),
            sa.Column("transaction_id", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("invoice_number"),
        )
        op.create_index("ix_invoices_job_id", "invoices", ["job_id"])
        op.create_index("ix_invoices_estimate_id", "invoices", ["estimate_id"])
        op.create_index("ix_invoices_client_id", "invoices", ["client_id"])
        op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)
        op.create_index("ix_invoices_status", "invoices", ["status"])
        op.create_index("idx_invoices_status_paid", "invoices", ["status", "paid_at"])

    # 23. payments
    if "payments" not in existing_tables:
        op.create_table(
            "payments",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("invoice_id", sa.BigInteger(), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("payment_method", sa.Text(), nullable=False),
            sa.Column("transaction_id", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="completed", nullable=False),
            sa.Column("recorded_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("payment_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])
        op.create_index("ix_payments_recorded_by", "payments", ["recorded_by"])
        op.create_index("ix_payments_status", "payments", ["status"])
        op.create_index("ix_payments_transaction_id", "payments", ["transaction_id"])

    # 24. contracts
    if "contracts" not in existing_tables:
        op.create_table(
            "contracts",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=True),
            sa.Column("estimate_id", sa.BigInteger(), sa.ForeignKey("estimates.id", ondelete="CASCADE"), nullable=True),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("contract_number", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="action_required", nullable=False),
            sa.Column("client_signed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("counter_signed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("counter_signed_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("contract_data", postgresql.JSONB(), nullable=True),
            sa.Column("signing_token", sa.Text(), nullable=True),
            sa.Column("client_initials", sa.Text(), nullable=True),
            sa.Column("signature_name", sa.Text(), nullable=True),
            sa.Column("signature_type", sa.Text(), nullable=True),
            sa.Column("signature_data", sa.Text(), nullable=True),
            sa.Column("signed_pdf_url", sa.Text(), nullable=True),
            sa.Column("signed_ip", sa.Text(), nullable=True),
            sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("contract_number"),
            sa.UniqueConstraint("signing_token"),
        )
        op.create_index("ix_contracts_lead_id", "contracts", ["lead_id"])
        op.create_index("ix_contracts_estimate_id", "contracts", ["estimate_id"])
        op.create_index("ix_contracts_job_id", "contracts", ["job_id"])
        op.create_index("ix_contracts_client_id", "contracts", ["client_id"])
        op.create_index("ix_contracts_counter_signed_by", "contracts", ["counter_signed_by"])
        op.create_index("ix_contracts_signing_token", "contracts", ["signing_token"], unique=True)
        op.create_index("ix_contracts_is_archived", "contracts", ["is_archived"])

    # 25. contract_signatures
    if "contract_signatures" not in existing_tables:
        op.create_table(
            "contract_signatures",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("contract_id", sa.BigInteger(), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("signer_role", sa.Text(), nullable=False),
            sa.Column("signer_name", sa.Text(), nullable=False),
            sa.Column("signer_email", sa.Text(), nullable=True),
            sa.Column("signature_data", sa.Text(), nullable=True),
            sa.Column("ip_address", sa.Text(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("signed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contract_signatures_contract_id", "contract_signatures", ["contract_id"])

    # 26. contract_audit_events
    if "contract_audit_events" not in existing_tables:
        op.create_table(
            "contract_audit_events",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("contract_id", sa.BigInteger(), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
            sa.Column("event_type", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("actor_name", sa.Text(), nullable=True),
            sa.Column("actor_ip", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_contract_audit_events_contract_id", "contract_audit_events", ["contract_id"])
        op.create_index("ix_contract_audit_events_event_type", "contract_audit_events", ["event_type"])
        op.create_index("ix_contract_audit_events_created_at", "contract_audit_events", ["created_at"])

    # 27. inspections
    if "inspections" not in existing_tables:
        op.create_table(
            "inspections",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("inspection_number", sa.Text(), nullable=False),
            sa.Column("inspector_name", sa.Text(), nullable=False),
            sa.Column("inspection_date", sa.Date(), nullable=False),
            sa.Column("roof_health_score", sa.Integer(), server_default="85", nullable=False),
            sa.Column("findings", postgresql.JSONB(), server_default='[]', nullable=False),
            sa.Column("urgent_action_required", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("estimated_remaining_years", sa.Integer(), server_default="3", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("access_token", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("inspection_number"),
        )
        op.create_index("ix_inspections_lead_id", "inspections", ["lead_id"])
        op.create_index("ix_inspections_job_id", "inspections", ["job_id"])
        op.create_index("ix_inspections_client_id", "inspections", ["client_id"])
        op.create_index("ix_inspections_inspection_number", "inspections", ["inspection_number"], unique=True)
        op.create_index("ix_inspections_access_token", "inspections", ["access_token"], unique=True)

    # 28. warranties
    if "warranties" not in existing_tables:
        op.create_table(
            "warranties",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("warranty_number", sa.Text(), nullable=False),
            sa.Column("warranty_type", sa.Text(), nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("expiration_date", sa.Date(), nullable=False),
            sa.Column("coverage_details", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="active", nullable=False),
            sa.Column("checkin_6mo_due", sa.Date(), nullable=True),
            sa.Column("checkin_1yr_due", sa.Date(), nullable=True),
            sa.Column("checkin_6mo_completed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("checkin_1yr_completed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("access_token", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("warranty_number"),
        )
        op.create_index("ix_warranties_job_id", "warranties", ["job_id"])
        op.create_index("ix_warranties_lead_id", "warranties", ["lead_id"])
        op.create_index("ix_warranties_client_id", "warranties", ["client_id"])
        op.create_index("ix_warranties_warranty_number", "warranties", ["warranty_number"], unique=True)
        op.create_index("ix_warranties_access_token", "warranties", ["access_token"], unique=True)

    # 29. reviews
    if "reviews" not in existing_tables:
        op.create_table(
            "reviews",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("lead_id", sa.BigInteger(), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
            sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
            sa.Column("customer_name", sa.Text(), nullable=False),
            sa.Column("customer_city", sa.Text(), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("feedback", sa.Text(), nullable=True),
            sa.Column("service_type", sa.Text(), nullable=True),
            sa.Column("source", sa.Text(), server_default="direct", nullable=False),
            sa.Column("status", sa.Text(), server_default="pending", nullable=False),
            sa.Column("review_token", sa.Text(), nullable=True),
            sa.Column("google_review_id", sa.Text(), nullable=True),
            sa.Column("author_photo", sa.Text(), nullable=True),
            sa.Column("original_time", sa.Text(), nullable=True),
            sa.Column("owner_reply", sa.Text(), nullable=True),
            sa.Column("yelp_review_id", sa.Text(), nullable=True),
            sa.Column("yelp_review_url", sa.Text(), nullable=True),
            sa.Column("google_clicked", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_reviews_lead_id", "reviews", ["lead_id"])
        op.create_index("ix_reviews_job_id", "reviews", ["job_id"])
        op.create_index("ix_reviews_client_id", "reviews", ["client_id"])
        op.create_index("ix_reviews_rating", "reviews", ["rating"])
        op.create_index("ix_reviews_status", "reviews", ["status"])
        op.create_index("ix_reviews_review_token", "reviews", ["review_token"], unique=True)
        op.create_index("ix_reviews_google_review_id", "reviews", ["google_review_id"], unique=True)
        op.create_index("ix_reviews_yelp_review_id", "reviews", ["yelp_review_id"], unique=True)

    # 30. templates
    if "templates" not in existing_tables:
        op.create_table(
            "templates",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("category", sa.Text(), nullable=False),
            sa.Column("type", sa.Text(), server_default="both", nullable=False),
            sa.Column("subject", sa.Text(), nullable=True),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_templates_category", "templates", ["category"])

    # 31. app_settings
    if "app_settings" not in existing_tables:
        op.create_table(
            "app_settings",
            sa.Column("key", sa.Text(), primary_key=True, nullable=False),
            sa.Column("value", postgresql.JSONB(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 32. daily_stats_snapshots
    if "daily_stats_snapshots" not in existing_tables:
        op.create_table(
            "daily_stats_snapshots",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("snapshot_date", sa.Date(), nullable=False),
            sa.Column("new_leads", sa.Integer(), server_default="0", nullable=True),
            sa.Column("contacted", sa.Integer(), server_default="0", nullable=True),
            sa.Column("est_scheduled", sa.Integer(), server_default="0", nullable=True),
            sa.Column("est_sent", sa.Integer(), server_default="0", nullable=True),
            sa.Column("jobs_won", sa.Integer(), server_default="0", nullable=True),
            sa.Column("lost_closed", sa.Integer(), server_default="0", nullable=True),
            sa.Column("ytd_revenue", sa.Numeric(14, 2), server_default="0.00", nullable=True),
            sa.Column("active_crew", sa.Integer(), server_default="0", nullable=True),
            sa.Column("total_pipeline_value", sa.Numeric(14, 2), server_default="0.00", nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("snapshot_date"),
        )
        op.create_index("ix_daily_stats_snapshots_snapshot_date", "daily_stats_snapshots", ["snapshot_date"], unique=True)

    # 33. crm_crews
    if "crm_crews" not in existing_tables:
        op.create_table(
            "crm_crews",
            sa.Column("id", sa.String(32), primary_key=True, nullable=False),
            sa.Column("name", sa.String(128), nullable=False),
            sa.Column("lead", sa.String(64), nullable=False),
            sa.Column("phone", sa.String(32), nullable=False),
            sa.Column("specialty", sa.String(128), nullable=False),
            sa.Column("members_count", sa.Integer(), server_default="4", nullable=False),
            sa.Column("vehicle", sa.String(128), nullable=False),
            sa.Column("avatar_color", sa.String(64), server_default="from-sky-500 to-blue-600", nullable=True),
            sa.Column("status", sa.String(16), server_default="active", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 34. crm_calendar_events
    if "crm_calendar_events" not in existing_tables:
        op.create_table(
            "crm_calendar_events",
            sa.Column("id", sa.String(64), primary_key=True, nullable=False),
            sa.Column("title", sa.String(256), nullable=False),
            sa.Column("job_code", sa.String(32), nullable=True),
            sa.Column("customer_name", sa.String(128), nullable=False),
            sa.Column("phone", sa.String(32), nullable=True),
            sa.Column("email", sa.String(128), nullable=True),
            sa.Column("address", sa.Text(), nullable=False),
            sa.Column("city", sa.String(64), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("day_number", sa.Integer(), nullable=False),
            sa.Column("month", sa.Integer(), nullable=False),
            sa.Column("year", sa.Integer(), nullable=False),
            sa.Column("start_time", sa.String(16), nullable=False),
            sa.Column("end_time", sa.String(16), nullable=False),
            sa.Column("category", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), server_default="scheduled", nullable=False),
            sa.Column("assigned_to_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("crew_id", sa.String(32), sa.ForeignKey("crm_crews.id", ondelete="SET NULL"), nullable=True),
            sa.Column("crew_name", sa.String(128), nullable=False),
            sa.Column("foreman_name", sa.String(64), nullable=False),
            sa.Column("foreman_phone", sa.String(32), nullable=True),
            sa.Column("squares", sa.Numeric(6, 1), nullable=True),
            sa.Column("material", sa.String(128), nullable=True),
            sa.Column("delivery_supplier", sa.String(128), nullable=True),
            sa.Column("permit_number", sa.String(64), nullable=True),
            sa.Column("permit_type", sa.String(64), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("is_weather_sensitive", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_crm_calendar_events_assigned_to_user_id", "crm_calendar_events", ["assigned_to_user_id"])
        op.create_index("ix_crm_calendar_events_crew_id", "crm_calendar_events", ["crew_id"])

    # 35. crm_user_tasks
    if "crm_user_tasks" not in existing_tables:
        op.create_table(
            "crm_user_tasks",
            sa.Column("id", sa.String(64), primary_key=True, nullable=False),
            sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("priority", sa.String(30), server_default="normal", nullable=False),
            sa.Column("work_category", sa.String(50), server_default="Rise Up", nullable=False),
            sa.Column("completed", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("due_date", sa.String(50), server_default="Today", nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_crm_user_tasks_user_id", "crm_user_tasks", ["user_id"])

    # 36. crm_hero_banners
    if "crm_hero_banners" not in existing_tables:
        op.create_table(
            "crm_hero_banners",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("subtitle", sa.Text(), nullable=True),
            sa.Column("cta_text", sa.Text(), nullable=True),
            sa.Column("cta_link", sa.Text(), nullable=True),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("badge_text", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 37. crm_quote_banners
    if "crm_quote_banners" not in existing_tables:
        op.create_table(
            "crm_quote_banners",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("title", sa.Text(), nullable=False),
            sa.Column("subtitle", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("auto_rotate_interval", sa.Integer(), server_default="5000", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 38. crm_quote_banner_slides
    if "crm_quote_banner_slides" not in existing_tables:
        op.create_table(
            "crm_quote_banner_slides",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("banner_id", sa.BigInteger(), sa.ForeignKey("crm_quote_banners.id", ondelete="CASCADE"), nullable=False),
            sa.Column("quote_text", sa.Text(), nullable=False),
            sa.Column("author", sa.Text(), nullable=True),
            sa.Column("rating", sa.Integer(), server_default="5", nullable=False),
            sa.Column("badge", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        )
        op.create_index("ix_crm_quote_banner_slides_banner_id", "crm_quote_banner_slides", ["banner_id"])

    # 39. estimate_templates
    if "estimate_templates" not in existing_tables:
        op.create_table(
            "estimate_templates",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("template_key", sa.Text(), nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("service_type", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("budget_tier_name", sa.Text(), nullable=False),
            sa.Column("budget_material_details", sa.Text(), nullable=False),
            sa.Column("budget_scope_of_work", sa.Text(), nullable=False),
            sa.Column("premium_tier_name", sa.Text(), nullable=False),
            sa.Column("premium_material_details", sa.Text(), nullable=False),
            sa.Column("premium_scope_of_work", sa.Text(), nullable=False),
            sa.Column("price_multiplier_budget", sa.Numeric(5, 2), server_default="1.00", nullable=False),
            sa.Column("price_multiplier_premium", sa.Numeric(5, 2), server_default="1.25", nullable=False),
            sa.Column("warranty_years", sa.Integer(), server_default="50", nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by", sa.Text(), nullable=True),
            sa.UniqueConstraint("template_key"),
        )

    # 40. estimator_services
    if "estimator_services" not in existing_tables:
        op.create_table(
            "estimator_services",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("slug", sa.Text(), nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("short_label", sa.Text(), nullable=False),
            sa.Column("icon_key", sa.Text(), nullable=False),
            sa.Column("badge_label", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("slug"),
        )

    # 41. estimator_pricing_rules
    if "estimator_pricing_rules" not in existing_tables:
        op.create_table(
            "estimator_pricing_rules",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("service_id", sa.Integer(), sa.ForeignKey("estimator_services.id", ondelete="CASCADE"), nullable=False),
            sa.Column("price_per_sqft_low", sa.Numeric(10, 2), nullable=False),
            sa.Column("price_per_sqft_high", sa.Numeric(10, 2), nullable=False),
            sa.Column("base_fee_low", sa.Numeric(10, 2), server_default="0.00", nullable=False),
            sa.Column("base_fee_high", sa.Numeric(10, 2), server_default="0.00", nullable=False),
            sa.Column("min_sqft", sa.Integer(), server_default="500", nullable=False),
            sa.Column("max_sqft", sa.Integer(), server_default="12000", nullable=False),
            sa.Column("apr_available", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("financing_apr", sa.Numeric(5, 2), server_default="0.00", nullable=False),
            sa.Column("financing_term_months", sa.Integer(), server_default="60", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by", sa.Text(), nullable=True),
        )
        op.create_index("ix_estimator_pricing_rules_service_id", "estimator_pricing_rules", ["service_id"])

    # 42. estimator_size_presets
    if "estimator_size_presets" not in existing_tables:
        op.create_table(
            "estimator_size_presets",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("service_id", sa.Integer(), sa.ForeignKey("estimator_services.id", ondelete="CASCADE"), nullable=False),
            sa.Column("label", sa.Text(), nullable=False),
            sa.Column("sqft_value", sa.Integer(), nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        )
        op.create_index("ix_estimator_size_presets_service_id", "estimator_size_presets", ["service_id"])

    # 43. estimator_leads
    if "estimator_leads" not in existing_tables:
        op.create_table(
            "estimator_leads",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("service_id", sa.Integer(), sa.ForeignKey("estimator_services.id", ondelete="SET NULL"), nullable=True),
            sa.Column("sqft_entered", sa.Integer(), nullable=False),
            sa.Column("estimate_low", sa.Numeric(10, 2), nullable=False),
            sa.Column("estimate_high", sa.Numeric(10, 2), nullable=False),
            sa.Column("source", sa.Text(), nullable=False),
            sa.Column("session_id", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_estimator_leads_service_id", "estimator_leads", ["service_id"])
        op.create_index("ix_estimator_leads_created_at", "estimator_leads", ["created_at"])

    # 44. financing_plans
    if "financing_plans" not in existing_tables:
        op.create_table(
            "financing_plans",
            sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("apr", sa.Numeric(5, 2), server_default="0.00", nullable=False),
            sa.Column("term_months", sa.Integer(), nullable=False),
            sa.Column("min_down_payment_pct", sa.Numeric(5, 2), server_default="0.00", nullable=False),
            sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
            sa.Column("badge_label", sa.Text(), nullable=True),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 45. financing_settings
    if "financing_settings" not in existing_tables:
        op.create_table(
            "financing_settings",
            sa.Column("id", sa.Integer(), primary_key=True, default=1),
            sa.Column("min_project_cost", sa.Numeric(10, 2), server_default="5000.00", nullable=False),
            sa.Column("max_project_cost", sa.Numeric(10, 2), server_default="50000.00", nullable=False),
            sa.Column("default_project_cost", sa.Numeric(10, 2), server_default="16500.00", nullable=False),
            sa.Column("credit_check_copy_flag", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_by", sa.Text(), nullable=True),
        )

    # 46. financing_calculations
    if "financing_calculations" not in existing_tables:
        op.create_table(
            "financing_calculations",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("plan_id", sa.Integer(), sa.ForeignKey("financing_plans.id", ondelete="SET NULL"), nullable=True),
            sa.Column("project_cost", sa.Numeric(10, 2), nullable=False),
            sa.Column("down_payment", sa.Numeric(10, 2), server_default="0.00", nullable=False),
            sa.Column("monthly_payment", sa.Numeric(10, 2), nullable=False),
            sa.Column("session_id", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_financing_calculations_plan_id", "financing_calculations", ["plan_id"])
        op.create_index("ix_financing_calculations_created_at", "financing_calculations", ["created_at"])

    # 47. analytics_events
    if "analytics_events" not in existing_tables:
        op.create_table(
            "analytics_events",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("session_id", sa.Text(), nullable=False),
            sa.Column("event_type", sa.Text(), nullable=False),
            sa.Column("page_path", sa.Text(), nullable=False),
            sa.Column("element", sa.Text(), nullable=True),
            sa.Column("label", sa.Text(), nullable=True),
            sa.Column("x_pct", sa.Float(), nullable=True),
            sa.Column("y_pct", sa.Float(), nullable=True),
            sa.Column("scroll_pct", sa.Integer(), nullable=True),
            sa.Column("referrer", sa.Text(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("device_type", sa.Text(), nullable=True),
            sa.Column("country", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("utm_source", sa.Text(), nullable=True),
            sa.Column("utm_medium", sa.Text(), nullable=True),
            sa.Column("utm_campaign", sa.Text(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_analytics_events_session_id", "analytics_events", ["session_id"])
        op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"])
        op.create_index("idx_ae_type_date", "analytics_events", ["event_type", "created_at"])
        op.create_index("idx_ae_path_type", "analytics_events", ["page_path", "event_type"])

    # 48. activity_log
    if "activity_log" not in existing_tables:
        op.create_table(
            "activity_log",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("session_id", sa.Text(), nullable=False),
            sa.Column("event_type", sa.Text(), nullable=False),
            sa.Column("page_path", sa.Text(), nullable=False),
            sa.Column("label", sa.Text(), nullable=True),
            sa.Column("element", sa.Text(), nullable=True),
            sa.Column("device_type", sa.Text(), nullable=True),
            sa.Column("country", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("scroll_pct", sa.Integer(), nullable=True),
            sa.Column("duration_ms", sa.Integer(), nullable=True),
            sa.Column("utm_source", sa.Text(), nullable=True),
            sa.Column("utm_medium", sa.Text(), nullable=True),
            sa.Column("utm_campaign", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_activity_log_session_id", "activity_log", ["session_id"])
        op.create_index("ix_activity_log_created_at", "activity_log", ["created_at"])
        op.create_index("idx_al_event_type_date", "activity_log", ["event_type", "created_at"])

    # 49. call_events
    if "call_events" not in existing_tables:
        op.create_table(
            "call_events",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("session_id", sa.Text(), nullable=True),
            sa.Column("page_path", sa.Text(), nullable=True),
            sa.Column("device_type", sa.Text(), nullable=True),
            sa.Column("country", sa.Text(), nullable=True),
            sa.Column("city", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 50. api_keys
    if "api_keys" not in existing_tables:
        op.create_table(
            "api_keys",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("key_prefix", sa.String(16), nullable=False),
            sa.Column("key_hash", sa.String(128), nullable=False),
            sa.Column("label", sa.String(64), nullable=False),
            sa.Column("environment", sa.String(16), server_default="development", nullable=False),
            sa.Column("scopes", postgresql.ARRAY(sa.Text()), nullable=False),
            sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint("key_hash"),
        )
        op.create_index("ix_api_keys_key_prefix", "api_keys", ["key_prefix"])
        op.create_index("ix_api_keys_created_by", "api_keys", ["created_by"])

    # 51. audit_logs
    if "audit_logs" not in existing_tables:
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.BigInteger(), autoincrement=True, primary_key=True, nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=True),
            sa.Column("user_email", sa.Text(), nullable=True),
            sa.Column("user_role", sa.Text(), nullable=True),
            sa.Column("action", sa.Text(), nullable=False),
            sa.Column("resource_type", sa.Text(), nullable=False),
            sa.Column("resource_id", sa.Text(), nullable=True),
            sa.Column("ip_address", sa.Text(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("changes", postgresql.JSONB(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
        op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
        op.create_index("ix_audit_logs_resource_type", "audit_logs", ["resource_type"])
        op.create_index("ix_audit_logs_resource_id", "audit_logs", ["resource_id"])
        op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])
        op.create_index("idx_audit_logs_res_composite", "audit_logs", ["resource_type", "resource_id"])


def downgrade() -> None:
    tables = [
        "contract_audit_events", "contract_signatures", "contracts",
        "payments", "invoices", "job_tasks", "job_permits", "job_change_orders",
        "job_expenses", "job_photos", "crew_members", "jobs", "estimates",
        "lead_stage_checklists", "tasks", "activities", "leads", "client_documents",
        "clients", "admin_sessions", "invitations", "user_roles", "role_permissions",
        "permissions", "roles", "users", "reviews", "warranties", "inspections",
        "templates", "app_settings", "daily_stats_snapshots", "crm_calendar_events",
        "crm_crews", "crm_user_tasks", "crm_hero_banners", "crm_quote_banner_slides",
        "crm_quote_banners", "estimate_templates", "estimator_pricing_rules",
        "estimator_size_presets", "estimator_leads", "estimator_services",
        "financing_calculations", "financing_plans", "financing_settings",
        "analytics_events", "activity_log", "call_events", "api_keys", "audit_logs"
    ]
    for table in tables:
        op.drop_table(table)
