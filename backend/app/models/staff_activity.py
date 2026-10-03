from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import BigInteger, DateTime, Index, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StaffActivity(Base):
    """Read-only mapping of ``staff_activity_log``.

    The table is append-only and populated exclusively by database triggers (see migration
    0004). The application never inserts, updates or deletes rows through this model; the
    triggers reject UPDATE/DELETE/TRUNCATE even if it tried.
    """

    __tablename__ = "staff_activity_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source: Mapped[str] = mapped_column(Text, server_default="data")
    action: Mapped[str] = mapped_column(Text)
    actor_type: Mapped[str] = mapped_column(Text, server_default="system")
    actor_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    actor_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actor_role: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    table_name: Mapped[str] = mapped_column(Text)
    record_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    record_label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    client_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    changed_fields: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    categories: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    changes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    old_values: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    __table_args__ = (Index("idx_activity_occurred", "occurred_at", "id"),)
