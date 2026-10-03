import pytest

from tests.factories import login_as, make_user

BASE = "/api/admin/me/customizations"
def _png() -> bytes:
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (2, 1)).save(buf, format="PNG")
    return buf.getvalue()


PNG = _png()


@pytest.fixture
async def headers_a(db, user_owner):
    return await login_as(user_owner, db)


@pytest.fixture
async def headers_b(db, user_sales_rep):
    return await login_as(user_sales_rep, db)


async def test_requires_auth(client):
    assert (await client.get(BASE)).status_code in (401, 403)


async def test_empty_by_default(client, headers_a):
    r = await client.get(BASE, headers=headers_a)
    assert r.status_code == 200
    assert r.json()["data"] == {}


async def test_per_user_isolation_and_reset(client, headers_a, headers_b):
    body = {"image_url": "/static/uploads/customizations/1/x.png", "zoom": 120, "title": "Hi"}
    r = await client.put(f"{BASE}/hero:dashboard", json=body, headers=headers_a)
    assert r.status_code == 200, r.text
    assert r.json()["data"]["hero:dashboard"]["title"] == "Hi"
    assert (await client.get(BASE, headers=headers_b)).json()["data"] == {}
    assert "hero:dashboard" in (await client.get(BASE, headers=headers_a)).json()["data"]
    r = await client.delete(f"{BASE}/hero:dashboard", headers=headers_a)
    assert r.json()["data"] == {}
    assert (await client.get(BASE, headers=headers_a)).json()["data"] == {}


async def test_hero_apply_to_all(client, headers_a):
    img = "/static/uploads/customizations/1/a.png"
    await client.put(f"{BASE}/hero:leads", json={"image_url": "/static/uploads/customizations/1/old.png", "title": "Leads"}, headers=headers_a)
    await client.put(f"{BASE}/hero:jobs", json={"image_url": "/static/uploads/customizations/1/old2.png"}, headers=headers_a)
    r = await client.put(f"{BASE}/hero:dashboard", json={"image_url": img, "zoom": 140, "title": "Dash", "apply_to_all": True}, headers=headers_a)
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["hero:all"]["image_url"] == img
    assert data["hero:all"]["zoom"] == 140
    assert data["hero:all"]["title"] is None
    assert "hero:jobs" not in data
    assert data["hero:leads"]["title"] == "Leads" and data["hero:leads"]["image_url"] is None
    assert data["hero:dashboard"]["title"] == "Dash" and data["hero:dashboard"]["image_url"] is None


@pytest.mark.parametrize(
    "slot,body",
    [
        ("hero:x", {"image_url": "data:image/png;base64,AAA"}),
        ("hero:x", {"image_url": "javascript:alert(1)"}),
        ("hero:x", {"title": "t" * 61}),
        ("hero:x", {"eyebrow": "e" * 81}),
        ("hero:x", {"subtitle": "s" * 161}),
        ("hero:x", {"zoom": 999}),
        ("hero:x", {"bogus": 1}),
        ("weather_widget", {"text_colors": {"tempColor": "red; x"}}),
        ("weather_widget", {"text_colors": {"nope": "#fff"}}),
        ("quote_banner", {"link_url": "javascript:x"}),
    ],
)
async def test_invalid_payloads_rejected(client, headers_a, slot, body):
    r = await client.put(f"{BASE}/{slot}", json=body, headers=headers_a)
    assert r.status_code == 422, r.text


async def test_text_limits_boundary(client, headers_a):
    body = {"eyebrow": "e" * 80, "title": "t" * 60, "subtitle": "s" * 160}
    assert (await client.put(f"{BASE}/hero:x", json=body, headers=headers_a)).status_code == 200


async def test_unknown_slot(client, headers_a):
    assert (await client.put(f"{BASE}/evil", json={}, headers=headers_a)).status_code == 400
    assert (await client.delete(f"{BASE}/Hero:BAD KEY", headers=headers_a)).status_code in (400, 404)


async def test_weather_sidebar_quote_roundtrip(client, headers_a):
    for slot, body in [
        ("weather_widget", {"location": "Dallas", "temp_unit": "C", "text_colors": {"tempColor": "#fff"}}),
        ("sidebar", {"photo_url": "/static/uploads/customizations/1/s.png"}),
        ("quote_banner", {"mode": "slideshow", "slides": [{"id": "s1", "image_url": "/static/uploads/customizations/1/q.png"}]}),
    ]:
        r = await client.put(f"{BASE}/{slot}", json=body, headers=headers_a)
        assert r.status_code == 200, r.text
        assert slot in r.json()["data"]


async def test_upload_ok_and_rejects(client, headers_a):
    r = await client.post(f"{BASE}/upload", files={"file": ("a.png", PNG, "image/png")}, headers=headers_a)
    assert r.status_code == 200, r.text
    d = r.json()["data"]
    assert d["url"].startswith("/static/uploads/customizations/")
    assert (d["width"], d["height"]) == (2, 1)
    r = await client.post(f"{BASE}/upload", files={"file": ("a.gif", b"GIF89a", "image/gif")}, headers=headers_a)
    assert r.status_code == 400
    big = b"0" * (8 * 1024 * 1024 + 10)
    r = await client.post(f"{BASE}/upload", files={"file": ("a.png", big, "image/png")}, headers=headers_a)
    assert r.status_code == 413
