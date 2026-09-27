from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Integer, Float, Text, DateTime, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    page_path: Mapped[str] = mapped_column(Text, nullable=False)
    element: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    x_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    y_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    scroll_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    utm_source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("idx_ae_type_date", "event_type", "created_at"),
        Index("idx_ae_path_type", "page_path", "event_type"),
    )

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    page_path: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    element: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scroll_pct: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    utm_source: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("idx_al_event_type_date", "event_type", "created_at"),
    )

class CallEvent(Base):
    __tablename__ = "call_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    page_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
