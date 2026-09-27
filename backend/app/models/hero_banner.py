from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class HeroBanner(Base):
    __tablename__ = "crm_hero_banners"

    page_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    zoom: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    position_x: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    position_y: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    opacity: Mapped[int] = mapped_column(Integer, nullable=False, default=90)
    overlay_strength: Mapped[int] = mapped_column(Integer, nullable=False, default=75)
    eyebrow: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    subtitle: Mapped[Optional[str]] = mapped_column(String(110), nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
