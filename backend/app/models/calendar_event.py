from datetime import datetime, date as py_date
from typing import Optional, List
from sqlalchemy import String, Integer, BigInteger, Boolean, Text, Date, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CrewResource(Base):
    __tablename__ = "crm_crews"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    lead: Mapped[str] = mapped_column(String(64), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    specialty: Mapped[str] = mapped_column(String(128), nullable=False)
    members_count: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    vehicle: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(64), default="from-sky-500 to-blue-600")
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    events: Mapped[List["CalendarEvent"]] = relationship("CalendarEvent", back_populates="crew")


class CalendarEvent(Base):
    __tablename__ = "crm_calendar_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    job_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    customer_name: Mapped[str] = mapped_column(String(128), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(64), nullable=False)
    date: Mapped[py_date] = mapped_column(Date, nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[str] = mapped_column(String(16), nullable=False)
    end_time: Mapped[str] = mapped_column(String(16), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), server_default="scheduled", nullable=False)
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    crew_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("crm_crews.id", ondelete="SET NULL"), nullable=True, index=True
    )
    crew_name: Mapped[str] = mapped_column(String(128), nullable=False)
    foreman_name: Mapped[str] = mapped_column(String(64), nullable=False)
    foreman_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    squares: Mapped[Optional[float]] = mapped_column(Numeric(6, 1), nullable=True)
    material: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    delivery_supplier: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    permit_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    permit_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_weather_sensitive: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    crew: Mapped[Optional["CrewResource"]] = relationship("CrewResource", back_populates="events")
