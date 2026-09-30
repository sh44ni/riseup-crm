from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    BigInteger, Integer, Text, Boolean, Date, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    inspection_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    inspector_name: Mapped[str] = mapped_column(Text, nullable=False)
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    roof_health_score: Mapped[int] = mapped_column(Integer, server_default="85", nullable=False)
    findings: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, server_default='[]', nullable=False)
    urgent_action_required: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    estimated_remaining_years: Mapped[int] = mapped_column(Integer, server_default="3", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    access_token: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Warranty(Base):
    __tablename__ = "warranties"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    warranty_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    warranty_type: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiration_date: Mapped[date] = mapped_column(Date, nullable=False)
    coverage_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, server_default="active", nullable=False)
    checkin_6mo_due: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    checkin_1yr_due: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    checkin_6mo_completed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    checkin_1yr_completed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    access_token: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lead_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    service_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(Text, server_default="direct", nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="pending", nullable=False, index=True)
    review_token: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    google_review_id: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    author_photo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    original_time: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    yelp_review_id: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True, index=True)
    yelp_review_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    google_clicked: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Template(Base):
    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    type: Mapped[str] = mapped_column(Text, server_default="both", nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
