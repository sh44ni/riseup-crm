"""Per-user UI customization schemas.

Each slot type has its own strict config model. Image URLs are restricted to
uploaded files (``/static/uploads/...``) or http(s) URLs; ``data:`` / ``javascript:``
URIs are rejected so a customization can never carry an active payload.
"""
import re
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_IMAGE_URL_LENGTH = 2048

SLOT_QUOTE = "quote_banner"
SLOT_WEATHER = "weather_widget"
SLOT_SIDEBAR = "sidebar"
SLOT_HERO_ALL = "hero:all"
HERO_PAGE_PREFIX = "hero:"

_HERO_PAGE_RE = re.compile(r"^hero:[a-z0-9][a-z0-9_-]{0,39}$")
_FIXED_SLOTS = {SLOT_QUOTE, SLOT_WEATHER, SLOT_SIDEBAR}


def slot_type(slot_key: str) -> Optional[str]:
    """Return the slot family ('hero_all', 'hero_page', 'quote_banner', ...) or None if invalid."""
    if slot_key == SLOT_HERO_ALL:
        return "hero_all"
    if _HERO_PAGE_RE.match(slot_key):
        return "hero_page"
    if slot_key in _FIXED_SLOTS:
        return slot_key
    return None


def validate_image_url(value: Optional[str]) -> Optional[str]:
    """Allow empty, uploaded files, or http(s) URLs. Reject everything else."""
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return ""
    if len(value) > MAX_IMAGE_URL_LENGTH:
        raise ValueError("Image URL is too long")
    if value.startswith("/static/uploads/") and ".." not in value:
        return value
    lowered = value.lower()
    if lowered.startswith("https://") or lowered.startswith("http://"):
        return value
    raise ValueError("Image must be an uploaded file or an http(s) URL")


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HeroConfig(_Strict):
    """Hero banner for one page (``hero:{page}``) or the user's default (``hero:all``).

    Every field is optional: ``None`` means "inherit" (page -> user default -> built-in).
    ``apply_to_all`` is a save-time instruction, never stored.
    """

    image_url: Optional[str] = None
    zoom: Optional[int] = Field(None, ge=100, le=250)
    position_x: Optional[int] = Field(None, ge=0, le=100)
    position_y: Optional[int] = Field(None, ge=0, le=100)
    opacity: Optional[int] = Field(None, ge=30, le=100)
    overlay_strength: Optional[int] = Field(None, ge=0, le=100)
    eyebrow: Optional[str] = Field(None, max_length=80)
    title: Optional[str] = Field(None, max_length=60)
    subtitle: Optional[str] = Field(None, max_length=160)

    _check_image = field_validator("image_url")(validate_image_url)


class HeroSaveRequest(HeroConfig):
    apply_to_all: bool = False


class QuoteSlide(_Strict):
    id: str = Field(..., min_length=1, max_length=64)
    image_url: str = Field(..., max_length=MAX_IMAGE_URL_LENGTH)
    title: Optional[str] = Field(None, max_length=128)
    alt_text: Optional[str] = Field(None, max_length=256)

    _check_image = field_validator("image_url")(validate_image_url)


class QuoteBannerConfig(_Strict):
    mode: Literal["single", "slideshow"] = "single"
    single_image_url: str = ""
    slides: List[QuoteSlide] = Field(default_factory=list, max_length=20)
    autoplay: bool = True
    slide_duration: int = Field(5, ge=2, le=60)
    transition_effect: Literal["fade", "slide"] = "fade"
    card_height: Literal["compact", "balanced", "tall"] = "balanced"
    image_fit: Literal["cover", "contain"] = "cover"
    link_url: Optional[str] = Field(None, max_length=2048)

    _check_image = field_validator("single_image_url")(validate_image_url)

    @field_validator("link_url")
    @classmethod
    def _check_link(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if v == "":
            return None
        lowered = v.lower()
        if v.startswith("/") and not v.startswith("//"):
            return v
        if lowered.startswith("https://") or lowered.startswith("http://"):
            return v
        raise ValueError("Link must be an internal path or an http(s) URL")


WEATHER_COLOR_KEYS = {
    "tempColor",
    "secondaryTempColor",
    "metricsColor",
    "locationColor",
    "conditionBadgeColor",
    "conditionBadgeBg",
}
_COLOR_RE = re.compile(r"^(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\)|hsla?\([0-9.,\s%deg]+\))$")


class WeatherConfig(_Strict):
    location: str = Field("", max_length=120)
    custom_image: str = ""
    image_opacity: int = Field(95, ge=40, le=100)
    overlay_strength: int = Field(45, ge=0, le=90)
    temp_unit: Literal["F", "C"] = "F"
    text_colors: Dict[str, str] = Field(default_factory=dict)

    _check_image = field_validator("custom_image")(validate_image_url)

    @field_validator("text_colors")
    @classmethod
    def _check_colors(cls, v: Dict[str, str]) -> Dict[str, str]:
        for key, color in v.items():
            if key not in WEATHER_COLOR_KEYS:
                raise ValueError(f"Unknown colour setting '{key}'")
            if not _COLOR_RE.match(color.strip()):
                raise ValueError(f"Invalid colour value for '{key}'")
        return v


class SidebarConfig(_Strict):
    photo_url: str = ""

    _check_image = field_validator("photo_url")(validate_image_url)


_CONFIG_MODELS = {
    "hero_all": HeroConfig,
    "hero_page": HeroConfig,
    SLOT_QUOTE: QuoteBannerConfig,
    SLOT_WEATHER: WeatherConfig,
    SLOT_SIDEBAR: SidebarConfig,
}


def validate_slot_config(slot_key: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    """Validate ``raw`` for ``slot_key`` and return the normalized dict to store.

    Raises ``ValueError`` for an unknown slot and pydantic ``ValidationError`` for bad data.
    """
    family = slot_type(slot_key)
    if family is None:
        raise ValueError(f"Unknown customization slot '{slot_key}'")
    model = _CONFIG_MODELS[family]
    if family in ("hero_all", "hero_page"):
        raw = {k: v for k, v in raw.items() if k != "apply_to_all"}
    cfg = model.model_validate(raw)
    data = cfg.model_dump(mode="json")
    if family == "hero_all":
        # Text copy is per page by design; the user-wide default carries image + framing only.
        data["eyebrow"] = data["title"] = data["subtitle"] = None
    return data


class CustomizationSlotResponse(BaseModel):
    slot_key: str
    config: Dict[str, Any]
    updated_at: Optional[str] = None


class CustomizationsMapResponse(BaseModel):
    success: bool = True
    data: Dict[str, Dict[str, Any]]


class CustomizationSaveResponse(BaseModel):
    success: bool = True
    data: Dict[str, Dict[str, Any]]
    message: str = "Customization saved"
