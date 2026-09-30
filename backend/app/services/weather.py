from app.core.logger import get_logger
import httpx
import orjson
from typing import Dict, Any
from app.core.config import settings
from app.core.redis import cache_get, cache_set

logger = get_logger(__name__)

FALLBACK_WEATHER = {
    "location": "Oceanside, CA",
    "localtime": "2026-09-15 12:00",
    "current": {
        "temp_f": 72,
        "feelslike_f": 70,
        "humidity": 58,
        "wind_mph": 8,
        "wind_dir": "NW",
        "uv": 5,
        "precip_in": 0,
        "vis_miles": 10,
        "cloud": 20,
        "is_day": 1,
        "condition": {"text": "Sunny", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png", "code": 1000},
        "air_quality": {"us_epa_index": 1, "pm2_5": 5.2},
        "condition_key": "sunny",
    },
    "forecast": [
        {
            "date": "2026-09-15",
            "maxtemp_f": 76, "mintemp_f": 62, "avgtemp_f": 69,
            "daily_chance_of_rain": 0,
            "condition": {"text": "Sunny", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png", "condition_key": "sunny"},
            "sunrise": "6:28 AM", "sunset": "7:11 PM", "uv": 5,
        }
    ],
    "hourly": [],
    "isFallback": True,
}

def normalize_condition_key(text: str, is_day: int = 1) -> str:
    t = (text or "").lower()
    if not is_day and ("clear" in t or "sunny" in t):
        return "clear_night"
    if "sun" in t or "clear" in t:
        return "sunny"
    if "partly" in t:
        return "partly_cloudy"
    if "thunder" in t or "storm" in t or "lightning" in t:
        return "thunderstorm"
    if "rain" in t or "drizzle" in t or "shower" in t:
        return "rain"
    if "snow" in t or "blizzard" in t:
        return "snow"
    if "fog" in t or "mist" in t:
        return "fog"
    if "wind" in t or "breeze" in t:
        return "windy"
    if "cloud" in t or "overcast" in t:
        return "cloudy"
    return "sunny" if is_day else "clear_night"

async def get_weather_forecast(*args, **kwargs) -> Dict[str, Any]:
    location = kwargs.get("location") or (args[1] if len(args) >= 2 and isinstance(args[1], str) else (args[0] if len(args) >= 1 and isinstance(args[0], str) else "Oceanside, CA"))
    
    cache_key = f"weather_forecast:{location.lower().replace(' ', '_')}"
    cached = await cache_get(cache_key)
    if cached:
        try:
            return orjson.loads(cached)
        except Exception:
            pass

    api_key = getattr(settings, "WEATHER_API_KEY", None)
    if not api_key:
        return FALLBACK_WEATHER

    url = f"https://api.weatherapi.com/v1/forecast.json?key={api_key}&q={location}&days=3&aqi=yes&alerts=no"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return FALLBACK_WEATHER
            raw = resp.json()

            current = raw.get("current", {})
            loc = raw.get("location", {})
            forecast_days = raw.get("forecast", {}).get("forecastday", [])
            is_day = current.get("is_day", 1)
            cond_text = current.get("condition", {}).get("text", "Sunny")
            cond_key = normalize_condition_key(cond_text, is_day)

            shaped = {
                "location": f"{loc.get('name')}, {loc.get('region')}",
                "localtime": loc.get("localtime"),
                "current": {
                    "temp_f": round(current.get("temp_f", 72)),
                    "feelslike_f": round(current.get("feelslike_f", 70)),
                    "humidity": current.get("humidity", 50),
                    "wind_mph": round(current.get("wind_mph", 5)),
                    "wind_dir": current.get("wind_dir", "W"),
                    "uv": current.get("uv", 5),
                    "precip_in": current.get("precip_in", 0),
                    "vis_miles": current.get("vis_miles", 10),
                    "cloud": current.get("cloud", 0),
                    "is_day": is_day,
                    "condition": current.get("condition", {}),
                    "condition_key": cond_key,
                    "air_quality": current.get("air_quality"),
                },
                "forecast": [
                    {
                        "date": fd.get("date"),
                        "maxtemp_f": round(fd.get("day", {}).get("maxtemp_f", 75)),
                        "mintemp_f": round(fd.get("day", {}).get("mintemp_f", 60)),
                        "avgtemp_f": round(fd.get("day", {}).get("avgtemp_f", 68)),
                        "daily_chance_of_rain": fd.get("day", {}).get("daily_chance_of_rain", 0),
                        "condition": {
                            **(fd.get("day", {}).get("condition", {})),
                            "condition_key": normalize_condition_key(fd.get("day", {}).get("condition", {}).get("text", "Sunny"), 1),
                        },
                        "sunrise": fd.get("astro", {}).get("sunrise"),
                        "sunset": fd.get("astro", {}).get("sunset"),
                        "uv": fd.get("day", {}).get("uv"),
                    }
                    for fd in forecast_days
                ],
                "hourly": [],
                "isFallback": False,
            }

            await cache_set(cache_key, orjson.dumps(shaped).decode("utf-8"), ttl_seconds=1800)
            return shaped
    except Exception as e:
        logger.error(f"{e}")
        return FALLBACK_WEATHER

get_weather = get_weather_forecast
