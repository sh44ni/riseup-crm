from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class QuoteBanner(Base):
    __tablename__ = "crm_quote_banners"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default="default")
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="single")
    single_image_url: Mapped[str] = mapped_column(Text, nullable=False, default="/hero-bg.jpg")
    autoplay: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    slide_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    transition_effect: Mapped[str] = mapped_column(String(16), nullable=False, default="fade")
    card_height: Mapped[str] = mapped_column(String(16), nullable=False, default="balanced")
    image_fit: Mapped[str] = mapped_column(String(16), nullable=False, default="cover")
    link_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    updated_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    slides: Mapped[List["QuoteBannerSlide"]] = relationship(
        "QuoteBannerSlide",
        back_populates="banner",
        cascade="all, delete-orphan",
        order_by="QuoteBannerSlide.sort_order",
        lazy="selectin",
    )


class QuoteBannerSlide(Base):
    __tablename__ = "crm_quote_banner_slides"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    banner_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("crm_quote_banners.id", ondelete="CASCADE"), nullable=False, default="default"
    )
    image_url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    alt_text: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    banner: Mapped["QuoteBanner"] = relationship("QuoteBanner", back_populates="slides")
