from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    BigInteger, Integer, Numeric, Text, Boolean, Date, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Estimate(Base):
    __tablename__ = "estimates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    estimate_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    version: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="draft", nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_zip: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_type: Mapped[str] = mapped_column(Text, nullable=False)
    roof_squares: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    roof_pitch: Mapped[str] = mapped_column(Text, server_default="4:12", nullable=False)
    stories: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    tearoff_layers: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    material_type: Mapped[str] = mapped_column(Text, nullable=False)
    material_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    labor_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    addons: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, server_default='[]', nullable=True)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    margin_pct: Mapped[float] = mapped_column(Numeric(5, 2), server_default="30.00", nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    financing_months: Mapped[int] = mapped_column(Integer, server_default="60", nullable=False)
    monthly_payment: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    valid_until: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    template_key: Mapped[Optional[str]] = mapped_column(Text, server_default="multi_option_proposal", nullable=True)
    proposal_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signature_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    signature_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_role_snapshot: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_estimates_created_status", "created_at", "status"),
        Index("idx_estimates_status_created", "status", "created_at"),
    )

class EstimatorService(Base):
    __tablename__ = "estimator_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    short_label: Mapped[str] = mapped_column(Text, nullable=False)
    icon_key: Mapped[str] = mapped_column(Text, nullable=False)
    badge_label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class EstimatorPricingRule(Base):
    __tablename__ = "estimator_pricing_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("estimator_services.id", ondelete="CASCADE"), nullable=False, index=True)
    price_per_sqft_low: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    price_per_sqft_high: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    base_fee_low: Mapped[float] = mapped_column(Numeric(10, 2), server_default="0.00", nullable=False)
    base_fee_high: Mapped[float] = mapped_column(Numeric(10, 2), server_default="0.00", nullable=False)
    min_sqft: Mapped[int] = mapped_column(Integer, server_default="500", nullable=False)
    max_sqft: Mapped[int] = mapped_column(Integer, server_default="12000", nullable=False)
    apr_available: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    financing_apr: Mapped[float] = mapped_column(Numeric(5, 2), server_default="0.00", nullable=False)
    financing_term_months: Mapped[int] = mapped_column(Integer, server_default="60", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class EstimatorSizePreset(Base):
    __tablename__ = "estimator_size_presets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_id: Mapped[int] = mapped_column(Integer, ForeignKey("estimator_services.id", ondelete="CASCADE"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    sqft_value: Mapped[int] = mapped_column(Integer, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

class EstimatorLead(Base):
    __tablename__ = "estimator_leads"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("estimator_services.id", ondelete="SET NULL"), nullable=True, index=True)
    sqft_entered: Mapped[int] = mapped_column(Integer, nullable=False)
    estimate_low: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    estimate_high: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

class FinancingPlan(Base):
    __tablename__ = "financing_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    apr: Mapped[float] = mapped_column(Numeric(5, 2), server_default="0.00", nullable=False)
    term_months: Mapped[int] = mapped_column(Integer, nullable=False)
    min_down_payment_pct: Mapped[float] = mapped_column(Numeric(5, 2), server_default="0.00", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    badge_label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class FinancingSetting(Base):
    __tablename__ = "financing_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    min_project_cost: Mapped[float] = mapped_column(Numeric(10, 2), server_default="5000.00", nullable=False)
    max_project_cost: Mapped[float] = mapped_column(Numeric(10, 2), server_default="50000.00", nullable=False)
    default_project_cost: Mapped[float] = mapped_column(Numeric(10, 2), server_default="16500.00", nullable=False)
    credit_check_copy_flag: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    updated_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class FinancingCalculation(Base):
    __tablename__ = "financing_calculations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    plan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("financing_plans.id", ondelete="SET NULL"), nullable=True, index=True)
    project_cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    down_payment: Mapped[float] = mapped_column(Numeric(10, 2), server_default="0.00", nullable=False)
    monthly_payment: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
