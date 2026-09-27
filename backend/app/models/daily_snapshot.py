"""Daily dashboard stats snapshots for sparkline time-series."""
from sqlalchemy import Column, Integer, Numeric, Date, DateTime, func
from app.core.database import Base

class DailyStatsSnapshot(Base):
    __tablename__ = "daily_stats_snapshots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_date = Column(Date, unique=True, nullable=False, index=True)
    new_leads = Column(Integer, default=0)
    contacted = Column(Integer, default=0)
    est_scheduled = Column(Integer, default=0)
    est_sent = Column(Integer, default=0)
    jobs_won = Column(Integer, default=0)
    lost_closed = Column(Integer, default=0)
    ytd_revenue = Column(Numeric(14, 2), default=0)
    active_crew = Column(Integer, default=0)
    total_pipeline_value = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime, server_default=func.now())
