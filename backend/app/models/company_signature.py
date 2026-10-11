from datetime import datetime
from typing import List, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CompanySignatureVersion(Base):
    """Append-only version history of the single company contractor signature.

    The current signature is the row with the highest ``version``. Rows are never updated
    or deleted (database triggers reject UPDATE/DELETE/TRUNCATE, see migration 0005).
    Every row after the first configuration must carry a ``reason``.
    """

    __tablename__ = "company_signature_versions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)  # 'configured' | 'updated'
    signer_name: Mapped[str] = mapped_column(Text, nullable=False)
    signer_title: Mapped[str] = mapped_column(Text, nullable=False)
    signature_type: Mapped[str] = mapped_column(Text, nullable=False)  # 'typed' | 'drawn'
    signature_data: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    changed_fields: Mapped[List[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"), nullable=False)
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_by_name: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
