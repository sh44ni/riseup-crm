from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, JSON, Integer, ForeignKey, func
from app.core.database import Base

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    key_prefix = Column(String(20), nullable=False, index=True)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)
    last_four = Column(String(4), nullable=False)
    environment = Column(String(10), nullable=False, default="live")  # 'live' | 'test'
    scopes = Column(JSON, nullable=False, default=list)  # e.g. ['*'] or ['crm:read', 'estimates:calculate']
    rate_limit_per_minute = Column(Integer, nullable=False, default=120)
    allowed_origins = Column(JSON, nullable=False, default=list)  # e.g. ['*'] or ['https://riseuprac.com']
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    total_requests = Column(BigInteger, nullable=False, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    last_used_ip = Column(String(45), nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "key_prefix": self.key_prefix,
            "last_four": self.last_four,
            "environment": self.environment,
            "scopes": self.scopes or [],
            "rate_limit_per_minute": self.rate_limit_per_minute,
            "allowed_origins": self.allowed_origins or [],
            "is_active": self.is_active,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "total_requests": self.total_requests,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "last_used_ip": self.last_used_ip,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
