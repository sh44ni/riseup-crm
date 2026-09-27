from typing import Optional, List, Literal
from pydantic import BaseModel, Field

CalendarEventCategory = Literal[
    "team_task",
    "client_visit",
    "project_op",
    "city_permit",
    "warranty_audit",
    "roof_install",
    "boom_delivery",
    "roof_inspection",
    "warranty_checkin",
    "manual_task"
]

CalendarEventStatus = Literal[
    "scheduled",
    "in_progress",
    "completed",
    "weather_delay",
    "cancelled"
]


class CalendarEventPayload(BaseModel):
    id: str
    title: str
    jobCode: Optional[str] = None
    customerName: Optional[str] = "Team Operation"
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = "Headquarters"
    city: Optional[str] = "North County"
    date: str  # 'YYYY-MM-DD'
    dayNumber: int
    month: int
    year: int
    startTime: str
    endTime: str
    category: CalendarEventCategory
    status: CalendarEventStatus = "scheduled"
    assignedToUserId: Optional[int] = None
    assignedToName: Optional[str] = None
    assignedToRole: Optional[str] = None
    crewId: Optional[str] = None
    crewName: Optional[str] = None
    foremanName: Optional[str] = None
    foremanPhone: Optional[str] = None
    squares: Optional[float] = None
    material: Optional[str] = None
    deliverySupplier: Optional[str] = None
    permitNumber: Optional[str] = None
    permitType: Optional[str] = None
    notes: Optional[str] = None
    isWeatherSensitive: Optional[bool] = False
    completedAt: Optional[str] = None
    sourceType: Optional[str] = "dispatch"


class CalendarEventsListResponse(BaseModel):
    success: bool = True
    data: List[CalendarEventPayload]
    total: int
    message: Optional[str] = None


class CalendarEventSingleResponse(BaseModel):
    success: bool = True
    data: CalendarEventPayload
    message: Optional[str] = None


class CalendarStatsData(BaseModel):
    activeTeamMembers: int = 0
    operationsToday: int = 0
    completedToday: int = 0
    upcomingDeliveries: int = 0
    pendingPermits: int = 0
    scheduleConflicts: int = 0


class CalendarStatsResponse(BaseModel):
    success: bool = True
    data: CalendarStatsData


class CalendarWeatherData(BaseModel):
    tempF: int = 72
    windSpeedMph: int = 8
    gustMph: int = 12
    condition: str = "Clear Skies"
    safetyStatus: str = "safe"
    safetyLabel: str = "Safe for Rooftop Work"
    city: str = "Oceanside / North County"


class CalendarWeatherResponse(BaseModel):
    success: bool = True
    data: CalendarWeatherData
