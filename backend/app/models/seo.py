from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, Integer, Float, Text, DateTime, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SeoQuerySnapshot(Base):
    __tablename__ = "seo_query_snapshots"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    query: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    clicks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    impressions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ctr_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    position: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tier: Mapped[str] = mapped_column(Text, default="standard", nullable=False)  # tier1, tier2, tier3, standard
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_sqs_date_query", "snapshot_date", "query"),
        Index("idx_sqs_tier_date", "tier", "snapshot_date"),
    )
