from datetime import datetime, date
from typing import Optional, List, Any
from sqlalchemy import (
    BigInteger, Integer, Numeric, Text, Boolean, Date, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    estimate_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("estimates.id", ondelete="SET NULL"), nullable=True, index=True)
    job_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(Text, server_default="permit_pending", nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    zip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contract_value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    permit_status: Mapped[str] = mapped_column(Text, server_default="not_filed", nullable=False)
    permit_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    permit_filed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    permit_approved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    material_status: Mapped[str] = mapped_column(Text, server_default="not_ordered", nullable=False)
    material_ordered_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    material_delivered_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    crew_lead: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    crew_members: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default="{}", nullable=False)
    scheduled_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estimated_days: Mapped[int] = mapped_column(Integer, server_default="3", nullable=False)
    actual_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    weather_delays: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    milestones: Mapped[Optional[Any]] = mapped_column(JSONB, server_default='[]', nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    project_manager_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    foreman_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_role_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    stage: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_jobs_stage_created_at", "stage", "created_at"),
        Index("idx_jobs_status_created_at", "status", "created_at"),
        Index("idx_jobs_created_at", "created_at"),
    )

class CrewMember(Base):
    __tablename__ = "crew_members"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    current_job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    skills: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default="{}", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_crew_active_role", "active", "role"),
    )

class JobPhoto(Base):
    __tablename__ = "job_photos"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True, index=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="CASCADE"), nullable=True, index=True)
    phase: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[str] = mapped_column(Text, server_default="Field Crew", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_job_photos_job_phase", "job_id", "phase"),
    )

class JobExpense(Base):
    __tablename__ = "job_expenses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    vendor: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    invoice_receipt_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class JobChangeOrder(Base):
    __tablename__ = "job_change_orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="pending", nullable=False, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class JobPermit(Base):
    __tablename__ = "job_permits"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    permit_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    jurisdiction: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, server_default="not_filed", nullable=False, index=True)
    filed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    approved_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class JobTask(Base):
    __tablename__ = "job_tasks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    assigned_to: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

