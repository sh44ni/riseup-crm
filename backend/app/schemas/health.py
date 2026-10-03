from typing import Optional
from pydantic import BaseModel, ConfigDict


class HealthCheckResponse(BaseModel):
    status: str
    service: str
    env: str
    database: str
    redis: str
    timestamp: float

    model_config = ConfigDict(extra="allow")


class ReadinessCheckResponse(BaseModel):
    status: str
    ready: bool
    database: str
    redis: str
    migrations: str
    timestamp: float

    model_config = ConfigDict(extra="allow")
