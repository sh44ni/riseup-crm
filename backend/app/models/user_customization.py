from datetime import datetime
from typing import Any, Dict

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserUiCustomization(Base):
    """Per-user UI customization (hero banners, quote banner, weather widget, sidebar photo).

    One row per (user, slot). ``slot_key`` is one of ``hero:all``, ``hero:{page_id}``,
    ``quote_banner``, ``weather_widget`` or ``sidebar`` (see ``app.schemas.customization``).
    """

    __tablename__ = "user_ui_customizations"

    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    slot_key: Mapped[str] = mapped_column(String(80), primary_key=True)
    config: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
