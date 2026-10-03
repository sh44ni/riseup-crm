"""Staff activity (audit) log: capture, immutability, redaction, API access."""
import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from tests.factories import make_client

pytestmark = pytest.mark.asyncio


async def _entries(http, headers, **params):
    r = await http.get("/api/admin/activity", headers=headers, params=params)
    assert r.status_code == 200, r.text
    return r.json()["items"]


async def test_update_is_captured_with_actor_and_old_new(client, db, auth_owner, user_owner):
    c = await make_client(db, full_name="Audit Target", phone="760-555-0001")
    await db.commit()
    r = await client.patch(
        f"/api/admin/clients/{c.id}", headers=auth_owner, json={"phone": "760-555-9999"}
    )
    assert r.status_code == 200, r.text
    items = await _entries(client, auth_owner, client_id=c.id, action="update")
    assert items, "update should be logged"
    e = items[0]
    assert e["actor"]["user_id"] == user_owner.id
    assert e["record"]["type"] == "clients"
    assert "phone" in e["changed_fields"]
    assert "contact" in e["categories"]
    assert e["changes"]["phone"]["old"] == "760-555-0001"
    assert e["changes"]["phone"]["new"] == "760-555-9999"


async def test_delete_is_retained_and_flagged(client, db, auth_owner):
    c = await make_client(db, full_name="Doomed Client")
    await db.commit()
    r = await client.delete(f"/api/admin/clients/{c.id}", headers=auth_owner)
    assert r.status_code == 200, r.text
    archived = await _entries(client, auth_owner, client_id=c.id, action="update")
    assert any("status" in i["categories"] for i in archived)
    await db.execute(text("DELETE FROM clients WHERE id = :i"), {"i": c.id})
    await db.commit()
    items = await _entries(client, auth_owner, client_id=c.id)
    actions = {i["action"] for i in items}
    assert "delete" in actions
    assert all(i["record"]["deleted"] for i in items)


async def test_no_secrets_in_log(db, user_owner):
    await db.execute(text("UPDATE users SET name = name || 'x' WHERE id = :i"), {"i": user_owner.id})
    await db.commit()
    rows = (
        await db.execute(
            text(
                "SELECT coalesce(old_values::text,'') || coalesce(new_values::text,'') "
                "FROM staff_activity_log WHERE table_name='users'"
            )
        )
    ).scalars().all()
    blob = " ".join(rows).lower()
    for key in ("password", "salt", "token", "secret"):
        assert key not in blob


@pytest.mark.parametrize(
    "stmt",
    [
        "UPDATE staff_activity_log SET action='x'",
        "DELETE FROM staff_activity_log",
        "TRUNCATE staff_activity_log",
        "UPDATE audit_logs SET action='x'",
        "DELETE FROM audit_logs",
    ],
)
async def test_log_is_append_only(db, stmt):
    await make_client(db)
    await db.commit()
    with pytest.raises(DBAPIError):
        async with db.begin_nested():
            await db.execute(text(stmt))


async def test_filters_and_pagination(client, db, auth_owner):
    c = await make_client(db, full_name="Zed Filterable")
    await db.commit()
    for p in ("760-555-1111", "760-555-2222", "760-555-3333"):
        await client.patch(f"/api/admin/clients/{c.id}", headers=auth_owner, json={"phone": p})
    first = await client.get(
        "/api/admin/activity", headers=auth_owner, params={"client_id": c.id, "action": "update", "limit": 2}
    )
    body = first.json()
    assert len(body["items"]) == 2 and body["next_cursor"]
    second = await client.get(
        "/api/admin/activity",
        headers=auth_owner,
        params={"client_id": c.id, "action": "update", "limit": 2, "cursor": body["next_cursor"]},
    )
    assert second.status_code == 200
    ids = {i["id"] for i in body["items"]} | {i["id"] for i in second.json()["items"]}
    assert len(ids) == len(body["items"]) + len(second.json()["items"])
    by_name = await _entries(client, auth_owner, client="Zed Filterable")
    assert by_name and all(i["record"]["client_id"] == c.id for i in by_name)
    other = await _entries(client, auth_owner, client="no-such-client-xyz")
    assert other == []


async def test_invalid_inputs(client, auth_owner):
    assert (await client.get("/api/admin/activity", headers=auth_owner, params={"action": "bogus"})).status_code == 422
    assert (await client.get("/api/admin/activity", headers=auth_owner, params={"cursor": "!!!"})).status_code == 400
    assert (await client.get("/api/admin/activity/999999999", headers=auth_owner)).status_code == 404


async def test_access_control(client, auth_sales_rep):
    assert (await client.get("/api/admin/activity")).status_code == 401
    assert (await client.get("/api/admin/activity", headers=auth_sales_rep)).status_code == 403
    assert (await client.get("/api/admin/activity/export.csv", headers=auth_sales_rep)).status_code == 403


async def test_export_csv_is_logged(client, auth_owner):
    r = await client.get("/api/admin/activity/export.csv", headers=auth_owner)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    items = await _entries(client, auth_owner, action="security", q="activity.export")
    assert items
