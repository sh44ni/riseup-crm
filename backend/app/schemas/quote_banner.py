from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class QuoteSlidePayload(CamelModel):
    id: str = Field(..., description="Unique client or server generated slide identifier")
    image_url: str = Field(..., description="Absolute CDN URL or local asset path")
    title: Optional[str] = Field(None, max_length=128)
    alt_text: Optional[str] = Field(None, max_length=256)


class QuoteBannerConfigPayload(CamelModel):
    mode: Literal["single", "slideshow"] = Field("single", description="Banner display mode")
    single_image_url: str = Field(..., description="Active image for single mode")
    slides: List[QuoteSlidePayload] = Field(default_factory=list, description="Ordered slides for carousel mode")
    autoplay: bool = Field(True, description="Autoplay enabled for carousel")
    slide_duration: int = Field(5, ge=2, le=15, description="Display duration in seconds")
    transition_effect: Literal["fade", "slide"] = Field("fade")
    card_height: Literal["compact", "balanced", "tall"] = Field("balanced")
    image_fit: Literal["cover", "contain"] = Field("cover")
    link_url: Optional[str] = Field(None, description="Optional click-through URL")


class QuoteBannerResponse(CamelModel):
    success: bool = True
    data: QuoteBannerConfigPayload
    message: Optional[str] = None
