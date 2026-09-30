from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, Field, ConfigDict


class HeroBannerBase(BaseModel):
    image_url: str = Field(..., description="CDN URL for the panoramic background image")
    zoom: int = Field(100, ge=100, le=250, description="Zoom scale percentage (100% to 250%)")
    position_x: int = Field(50, ge=0, le=100, description="Horizontal pan position (0% left to 100% right)")
    position_y: int = Field(50, ge=0, le=100, description="Vertical pan position (0% top to 100% bottom)")
    opacity: int = Field(90, ge=30, le=100, description="Background image opacity (30% to 100%)")
    overlay_strength: int = Field(75, ge=0, le=100, description="Pearl liquid wash overlay strength (0% to 100%)")
    eyebrow: Optional[str] = Field(None, max_length=50, description="Uppercase header badge text (max 50 chars)")
    title: Optional[str] = Field(None, max_length=36, description="Bold main headline text (max 36 chars)")
    subtitle: Optional[str] = Field(None, max_length=110, description="Subtitle description (max 110 chars)")


class HeroBannerSaveRequest(HeroBannerBase):
    apply_globally: bool = Field(False, description="If true, image and viewport settings apply globally to all pages")


class HeroBannerResponse(HeroBannerBase):
    page_id: str
    is_global: bool
    updated_by: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HeroBannerMapResponse(BaseModel):
    global_banner: Optional[HeroBannerResponse] = None
    pages: Dict[str, HeroBannerResponse] = Field(default_factory=dict)
    cached_at: Optional[datetime] = None


class HeroImageUploadResponse(BaseModel):
    url: str
    filename: str
    content_type: str
    size_bytes: int
