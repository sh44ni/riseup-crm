from datetime import datetime
from typing import Optional, Any
from sqlalchemy import (
    BigInteger, Integer, Numeric, Text, Boolean, DateTime, ForeignKey, func, Index, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class LeadStageChecklist(Base):
    __tablename__ = "lead_stage_checklists"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lead_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    stage: Mapped[str] = mapped_column(Text, nullable=False)
    item_key: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    completed_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("lead_id", "stage", "item_key", name="unique_lead_stage_checklist_item"),
        Index("idx_lead_stage_checklists_lead_stage", "lead_id", "stage"),
    )

class EstimateTemplate(Base):
    __tablename__ = "estimate_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    service_type: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    budget_tier_name: Mapped[str] = mapped_column(Text, nullable=False)
    budget_material_details: Mapped[str] = mapped_column(Text, nullable=False)
    budget_scope_of_work: Mapped[str] = mapped_column(Text, nullable=False)
    premium_tier_name: Mapped[str] = mapped_column(Text, nullable=False)
    premium_material_details: Mapped[str] = mapped_column(Text, nullable=False)
    premium_scope_of_work: Mapped[str] = mapped_column(Text, nullable=False)
    price_multiplier_budget: Mapped[float] = mapped_column(Numeric(5, 2), server_default="1.00", nullable=False)
    price_multiplier_premium: Mapped[float] = mapped_column(Numeric(5, 2), server_default="1.25", nullable=False)
    warranty_years: Mapped[int] = mapped_column(Integer, server_default="50", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class Contract(Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="CASCADE"), nullable=True, index=True)
    estimate_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("estimates.id", ondelete="CASCADE"), nullable=True, index=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    contract_number: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True)
    status: Mapped[str] = mapped_column(Text, server_default="action_required", nullable=False)
    client_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    counter_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    counter_signed_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    contract_data: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    signing_token: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    client_initials: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signed_pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signed_ip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, server_default="1", default=1, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class ContractSignature(Base):
    __tablename__ = "contract_signatures"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    signer_role: Mapped[str] = mapped_column(Text, nullable=False)
    signer_name: Mapped[str] = mapped_column(Text, nullable=False)
    signer_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ContractAuditEvent(Base):
    __tablename__ = "contract_audit_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    actor_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_ip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

