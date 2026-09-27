from datetime import datetime, date
from typing import Optional, Dict, Any
from sqlalchemy import (
    BigInteger, Numeric, Text, Date, DateTime, ForeignKey, func, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    estimate_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("estimates.id", ondelete="SET NULL"), nullable=True, index=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("clients.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    milestone_name: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default="pending", nullable=False, index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_invoices_status_paid", "status", "paid_at"),
    )

class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(Text, nullable=False)
    transaction_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    status: Mapped[str] = mapped_column(Text, server_default="completed", nullable=False, index=True)
    recorded_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

