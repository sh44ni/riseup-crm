from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import BigInteger, Text, DateTime, func, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    resource_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    __table_args__ = (
        Index("idx_audit_logs_res_composite", "resource_type", "resource_id"),
    )
