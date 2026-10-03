"""
P0 security-hotfix regression tests.

These tests use FastAPI dependency overrides and a tiny SQL-dispatching fake session so they
run without Postgres/Redis. They are characterisation tests for the P0 fixes; real-DB HTTP
tests arrive in P2.
"""
from contextlib import contextmanager
from typing import Any, Callable, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.permissions import AuthUser
from app.main import app
from app.middlewares.auth import require_auth


# ── Test helpers ────────────────────────────────────────────────────────────
class FakeResult:
    def __init__(self, rows: Optional[List[dict]] = None, scalar: Any = None):
        self._rows = rows or []
        self._scalar = scalar

    def mappings(self) -> "FakeResult":
        return self

    def first(self) -> Optional[dict]:
        return self._rows[0] if self._rows else None

    def all(self) -> List[dict]:
        return list(self._rows)

    def scalar(self) -> Any:
        return self._scalar

    def scalar_one_or_none(self) -> Any:
        return self._scalar


class FakeDB:
    """Dispatches `execute()` on a SQL substring. Records every statement for assertions."""

    def __init__(self, handlers: Optional[List[Tuple[str, Callable[[dict], FakeResult]]]] = None):
        self.handlers = handlers or []
        self.calls: List[Tuple[str, dict]] = []
        self.commit = AsyncMock()
        self.rollback = AsyncMock()

    async def execute(self, stmt: Any, params: Optional[dict] = None) -> FakeResult:
        sql = " ".join(str(stmt).split())
        self.calls.append((sql, params or {}))
        for needle, handler in self.handlers:
            if needle in sql:
                return handler(params or {})
        return FakeResult()

    def ran(self, needle: str) -> bool:
        return any(needle in sql for sql, _ in self.calls)


def make_user(
    *,
    user_id: int = 1,
    role: str = "owner",
    protected: bool = True,
    permissions: Optional[Dict[str, str]] = None,
) -> AuthUser:
    perms = permissions if permissions is not None else ({"*": "all"} if protected else {})
    return AuthUser(
        id=user_id,
        name=f"User {user_id}",
        email=f"user{user_id}@test.local",
        role=role,
        status="active",
        permissions=perms,
        is_protected_owner=protected,
    )


@contextmanager
def client_as(user: Optional[AuthUser], db: Optional[FakeDB] = None):
    db = db or FakeDB()

    async def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    if user is not None:
        app.dependency_overrides[require_auth] = lambda: user
    try:
        with patch("app.api.admin.rbac.record_audit_log", new=AsyncMock()), patch(
            "app.api.admin.rbac.invalidate_session_cache", new=AsyncMock()
        ):
            yield TestClient(app, raise_server_exceptions=False), db
    finally:
        app.dependency_overrides.clear()


ROLES = {
    "owner": {"id": 1, "name": "Owner", "is_protected": True},
    "sales_rep": {"id": 3, "name": "Sales Rep", "is_protected": False},
}


def roles_handler(params: dict) -> FakeResult:
    key = params.get("r")
    rid = params.get("rid")
    for role in ROLES.values():
        if rid == role["id"] or (
            key and key.strip().lower().replace(" ", "_") == role["name"].lower().replace(" ", "_")
        ):
            return FakeResult([dict(role)])
    return FakeResult()


def user_manager() -> AuthUser:
    """A non-owner who may assign roles (e.g. an office manager)."""
    return make_user(
        user_id=10,
        role="office_manager",
        protected=False,
        permissions={"users.assign_roles": "all", "users.invite": "all"},
    )


# ── WP-0.1: dashboard must require auth ─────────────────────────────────────
def test_dashboard_requires_auth():
    with client_as(None) as (client, _db):
        res = client.get("/api/admin/dashboard")
    assert res.status_code == 401


# ── WP-0.4: RBAC privilege escalation ───────────────────────────────────────
NEW_USER = {"name": "New Person", "email": "new@test.local", "password": "a-long-enough-password"}


def create_user_db() -> FakeDB:
    return FakeDB([
        ("FROM roles", roles_handler),
        ("INSERT INTO users", lambda p: FakeResult([{
            "id": 99, "name": p["name"], "email": p["email"], "phone": None, "role": p["role"], "status": "active",
        }])),
    ])


def test_non_owner_cannot_create_owner():
    with client_as(user_manager(), create_user_db()) as (client, db):
        res = client.post("/api/admin/users", json={**NEW_USER, "role": "owner"})
    assert res.status_code == 403
    assert not db.ran("INSERT INTO users")


def test_owner_can_create_owner():
    with client_as(make_user(), create_user_db()) as (client, db):
        res = client.post("/api/admin/users", json={**NEW_USER, "role": "owner"})
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "owner"
    assert db.ran("INSERT INTO user_roles")


def test_create_user_rejects_unknown_role():
    with client_as(make_user(), create_user_db()) as (client, db):
        res = client.post("/api/admin/users", json={**NEW_USER, "role": "superadmin"})
    assert res.status_code == 400
    assert not db.ran("INSERT INTO users")


def test_create_user_rejects_unexpected_fields_and_weak_password():
    with client_as(make_user(), create_user_db()) as (client, _db):
        extra = client.post("/api/admin/users", json={**NEW_USER, "role": "sales_rep", "is_admin": True})
        weak = client.post("/api/admin/users", json={**NEW_USER, "role": "sales_rep", "password": "short"})
    assert extra.status_code == 422
    assert weak.status_code == 422


def test_create_user_without_password_uses_invitation_not_default_password():
    db = FakeDB([
        ("SELECT name FROM roles", lambda p: FakeResult([("Sales Rep",)])),
        ("id = ANY(:rids)", lambda p: FakeResult([ROLES["sales_rep"]])),
        ("FROM roles", roles_handler),
        ("INSERT INTO invitations", lambda p: FakeResult([{
            "id": 5, "email": p["email"], "status": "pending", "expires_at": "2099-01-01T00:00:00",
        }])),
    ])
    payload = {"name": "Invited", "email": "invited@test.local", "role": "sales_rep"}
    with client_as(make_user(), db) as (client, db), patch(
        "app.api.admin.rbac.send_team_invitation_email", new=AsyncMock(return_value={"success": True})
    ):
        res = client.post("/api/admin/users", json=payload)
    assert res.status_code == 200
    assert res.json()["invited"] is True
    assert not db.ran("INSERT INTO users")


def test_no_default_password_remains_in_source():
    import pathlib

    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    offenders = [p for p in root.rglob("*.py") if "RiseUp2025" in p.read_text(encoding="utf-8", errors="ignore")]
    assert offenders == []


def test_non_owner_cannot_invite_owner():
    db = FakeDB([("FROM roles", lambda p: FakeResult([ROLES["owner"]]))])
    with client_as(user_manager(), db) as (client, db):
        res = client.post("/api/admin/invitations", json={"email": "x@test.local", "roleIds": [1]})
    assert res.status_code == 403
    assert not db.ran("INSERT INTO invitations")


def update_user_db(*, target_role: str = "owner", target_protected: bool = True, other_owners: int = 1) -> FakeDB:
    return FakeDB([
        ("FROM users u WHERE u.id", lambda p: FakeResult([
            {"id": p["id"], "role": target_role, "is_protected": target_protected}
        ])),
        ("COUNT(DISTINCT u.id)", lambda p: FakeResult(scalar=other_owners)),
        ("FROM roles", roles_handler),
        ("UPDATE users SET", lambda p: FakeResult([{
            "id": p["id"], "name": "N", "email": "e", "role": p.get("role", target_role), "status": p.get("status", "active"),
        }])),
    ])


def test_non_owner_cannot_modify_protected_user():
    with client_as(user_manager(), update_user_db()) as (client, db):
        by_role = client.put("/api/admin/users/2", json={"role": "sales_rep"})
        by_status = client.put("/api/admin/users/2", json={"status": "suspended"})
    assert by_role.status_code == 403
    assert by_status.status_code == 403
    assert not db.ran("UPDATE users SET")
    assert not db.ran("DELETE FROM user_roles")


def test_user_cannot_change_own_role():
    me = make_user(user_id=10, role="sales_rep", protected=False, permissions={"users.assign_roles": "all"})
    db = update_user_db(target_role="sales_rep", target_protected=False)
    with client_as(me, db) as (client, db):
        res = client.put("/api/admin/users/10", json={"role": "owner"})
    assert res.status_code == 403
    assert not db.ran("DELETE FROM user_roles")


def test_non_owner_cannot_promote_to_owner():
    db = update_user_db(target_role="sales_rep", target_protected=False)
    with client_as(user_manager(), db) as (client, db):
        res = client.put("/api/admin/users/2", json={"role": "owner"})
    assert res.status_code == 403
    assert not db.ran("DELETE FROM user_roles")


def test_update_without_role_does_not_wipe_user_roles():
    db = update_user_db(target_role="sales_rep", target_protected=False)
    with client_as(user_manager(), db) as (client, db):
        res = client.put("/api/admin/users/2", json={"name": "Renamed"})
    assert res.status_code == 200
    assert not db.ran("DELETE FROM user_roles")


def test_cannot_demote_last_owner():
    db = update_user_db(other_owners=0)
    with client_as(make_user(user_id=1), db) as (client, db):
        res = client.put("/api/admin/users/2", json={"role": "sales_rep"})
    assert res.status_code == 409
    assert not db.ran("DELETE FROM user_roles")


def test_owner_can_change_protected_users_role_when_another_owner_exists():
    db = update_user_db(other_owners=1)
    with client_as(make_user(user_id=1), db) as (client, db):
        res = client.put("/api/admin/users/2", json={"role": "sales_rep"})
    assert res.status_code == 200
    assert db.ran("DELETE FROM user_roles")
