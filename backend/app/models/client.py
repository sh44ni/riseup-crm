from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    BigInteger, Integer, Numeric, Text, Boolean, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    phone_normalized: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True, unique=True, index=True)
    secondary_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    zip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    property_type: Mapped[str] = mapped_column(Text, server_default="Single Family", nullable=False)
    roof_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    roof_sqf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    roof_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stories: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    hoa: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="lead", nullable=False, index=True)
    client_category: Mapped[str] = mapped_column(Text, server_default="lead", nullable=False, index=True)
    lost_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default='{"New Lead"}', nullable=False)
    total_revenue: Mapped[float] = mapped_column(Numeric(10, 2), server_default="0.00", nullable=False)
    total_jobs_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source_type: Mapped[str] = mapped_column(Text, server_default="website", nullable=False)
    acquired_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_source_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    client_since: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_clients_lower_email", func.lower(email)),
        Index("idx_clients_email_phone", "email", "phone"),
    )

class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    form_type: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    zip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_page: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, server_default="new", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(Text, server_default="cool", nullable=False)
    lead_score: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    lead_source: Mapped[Optional[str]] = mapped_column(Text, server_default="website", nullable=True)
    source_type: Mapped[str] = mapped_column(Text, server_default="website", nullable=False, index=True)
    lead_source_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pipeline_stage: Mapped[str] = mapped_column(Text, server_default="stage_1_lead_gen", nullable=False)
    stage_entered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    initial_contacted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    site_visit_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    site_visit_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    proposal_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    contract_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    job_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_contact_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    roof_sqf: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    roof_squares: Mapped[Optional[float]] = mapped_column(Numeric(6, 1), nullable=True)
    roof_pitch: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stories: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    roof_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_role_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_confirmed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    discount_applied: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    financing_interested: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    estimated_value: Mapped[float] = mapped_column(Numeric(10, 2), server_default="0.00", nullable=False)
    lost_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lost_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    lost_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_leads_pipeline_stage_entered", "pipeline_stage", "stage_entered_at"),
        Index("idx_leads_assigned_stage", "assigned_to_user_id", "pipeline_stage"),
        Index("idx_leads_status_created_at", "status", "created_at"),
        Index("idx_leads_status_source_type", "status", "source_type"),
    )

class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performed_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    call_duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meta_data: Mapped[Optional[Dict[str, Any]]] = mapped_column("metadata", JSONB, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("idx_activities_entity_type_id", "entity_type", "entity_id", "created_at"),
    )

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    entity_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entity_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(Text, server_default="task", nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[str] = mapped_column(Text, server_default="normal", nullable=False)
    work_category: Mapped[Optional[str]] = mapped_column(Text, server_default="Rise Up", nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_tasks_due_completed", "due_at", "completed_at"),
    )

class ClientDocument(Base):
    __tablename__ = "client_documents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_type: Mapped[Optional[str]] = mapped_column(Text, server_default="document", nullable=True)
    file_size: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    doc_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

