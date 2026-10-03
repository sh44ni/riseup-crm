"""
Characterisation tests for Calendar domain.
Tests calendar overview, events list, event creation, and weather lookup.
"""
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import text


@pytest.mark.asyncio
async def test_calendar_overview_happy_path(client, auth_owner):
    """GET /api/admin/calendar returns team calendar view."""
    res = await client.get("/api/admin/calendar", headers=auth_owner)
    assert res.status_code == 200
    data = res.json()
    assert "events" in data or "items" in data or isinstance(data, list) or "team" in data


@pytest.mark.asyncio
async def test_calendar_events_crud_happy_path(client, auth_owner):
    """POST and GET /api/admin/calendar/events creates and fetches calendar events."""
    payload = {
        "id": "evt_test_123456",
        "title": "On-Site Roof Inspection",
        "date": "2026-10-15",
        "dayNumber": 15,
        "month": 10,
        "year": 2026,
        "startTime": "09:00",
        "endTime": "11:00",
        "category": "roof_inspection",
        "status": "scheduled",
    }

    res = await client.post("/api/admin/calendar/events", json=payload, headers=auth_owner)
    assert res.status_code in (200, 201)
    data = res.json()
    assert data.get("success") is True
    assert "data" in data

    list_res = await client.get("/api/admin/calendar/events", headers=auth_owner)
    assert list_res.status_code == 200


@pytest.mark.asyncio
async def test_calendar_weather_happy_path(client, auth_owner):
    """GET /api/admin/weather returns weather forecast data."""
    res = await client.get("/api/admin/weather", headers=auth_owner)
    assert res.status_code == 200
