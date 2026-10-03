"""
P0 security-hotfix regression tests, part 2 (WP-0.5 to WP-0.9).

Shares the fake-session helpers with test_p0_security.py.
"""
import pathlib
import re
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import KNOWN_BAD_SECRET_HASHES, Settings, settings
from app.core.database import get_db
from app.main import app
from app.middlewares.auth import get_optional_current_user, require_auth
from test_p0_security import FakeDB, FakeResult, client_as, make_user

APP_ROOT = pathlib.Path(__file__).resolve().parents[1] / "app"
STRONG = "x" * 40


# ── WP-0.5: Google OAuth ────────────────────────────────────────────────────
@pytest.fixture
def oauth_env():
    from app.api.admin import integrations

    with patch.object(settings, "GOOGLE_CLIENT_ID", "client-id"), patch.object(
        settings, "GOOGLE_CLIENT_SECRET", "client-secret"
    ), patch.object(settings, "GOOGLE_REDIRECT_URI", ""), patch.object(
        settings, "PUBLIC_BACKEND_URL", "https://api.example.test"
    ), patch.object(settings, "CRM_FRONTEND_URL", "https://crm.example.test"), patch(
        "app.core.redis.is_redis_available", new=AsyncMock(return_value=False)
    ):
        yield integrations


def _as_callback_user(user):
    app.dependency_overrides[get_optional_current_user] = lambda: user


def _token_client(payload: dict, ok: bool = True):
    resp = MagicMock()
    resp.is_success = ok
    resp.json.return_value = payload
    client = MagicMock()
    client.post = AsyncMock(return_value=resp)
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return MagicMock(return_value=cm)


def _start_flow(client) -> str:
    res = client.get("/api/admin/google-auth", follow_redirects=False, headers={"Host": "evil.test"})
    assert res.status_code in (302, 307)
    params = parse_qs(urlparse(res.headers["location"]).query)
    assert params["redirect_uri"] == ["https://api.example.test/api/admin/google-callback"]
    return params["state"][0]


def test_google_auth_requires_authentication(oauth_env):
    with client_as(None) as (client, _db):
        res = client.get("/api/admin/google-auth", follow_redirects=False)
    assert res.status_code == 401


def test_google_callback_rejects_missing_or_unknown_state(oauth_env):
    user = make_user()
    with client_as(user) as (client, _db):
        _as_callback_user(user)
        missing = client.get("/api/admin/google-callback?code=abc", follow_redirects=False)
        forged = client.get("/api/admin/google-callback?code=abc&state=forged", follow_redirects=False)
    assert missing.status_code == 400
    assert forged.status_code == 400


def test_google_callback_state_is_single_use_and_bound_to_user(oauth_env):
    integrations = oauth_env
    user = make_user(user_id=1)
    other = make_user(user_id=2)
    save = AsyncMock()
    sync = AsyncMock(return_value={"syncedCount": 3})

    with client_as(user) as (client, _db), patch.object(integrations, "save_google_auth_settings", save), patch.object(
        integrations, "sync_google_reviews", sync
    ), patch.object(
        integrations.httpx, "AsyncClient", _token_client({"access_token": "a", "refresh_token": "r", "expires_in": 60})
    ):
        _as_callback_user(user)

        # A different signed-in user cannot consume someone else's state.
        stolen = _start_flow(client)
        _as_callback_user(other)
        assert client.get(f"/api/admin/google-callback?code=c&state={stolen}", follow_redirects=False).status_code == 400
        save.assert_not_called()

        # The rightful user succeeds once...
        _as_callback_user(user)
        state = _start_flow(client)
        ok = client.get(f"/api/admin/google-callback?code=c&state={state}", follow_redirects=False)
        assert ok.status_code in (302, 307)
        assert ok.headers["location"].startswith("https://crm.example.test/admin/reviews?")
        assert "google_connected=success" in ok.headers["location"]
        save.assert_awaited_once()
        assert save.await_args.args[1]["connected_by_user_id"] == 1

        # ...and a replay of the same state fails.
        replay = client.get(f"/api/admin/google-callback?code=c&state={state}", follow_redirects=False)
        assert replay.status_code == 400


def test_google_callback_does_not_reflect_exception_text(oauth_env):
    integrations = oauth_env
    user = make_user()
    boom = AsyncMock(side_effect=RuntimeError("SECRET-INTERNAL-DETAIL"))
    with client_as(user) as (client, _db), patch.object(integrations, "save_google_auth_settings", boom), patch.object(
        integrations.httpx, "AsyncClient", _token_client({"access_token": "a"})
    ):
        _as_callback_user(user)
        state = _start_flow(client)
        res = client.get(f"/api/admin/google-callback?code=c&state={state}", follow_redirects=False)
    assert "SECRET-INTERNAL-DETAIL" not in res.headers["location"]


# ── WP-0.6: error responses must not leak internals ─────────────────────────
@pytest.fixture
def boom_route():
    async def boom():
        raise ValueError("SECRET-INTERNAL-DETAIL /srv/app/secret.py")

    app.add_api_route("/__p0_boom", boom, methods=["GET"])
    try:
        yield
    finally:
        app.router.routes[:] = [r for r in app.router.routes if getattr(r, "path", "") != "/__p0_boom"]


def test_unhandled_exception_returns_generic_body_with_request_id(boom_route):
    with patch.object(settings, "DEBUG", False):
        res = TestClient(app, raise_server_exceptions=False).get("/__p0_boom")
    assert res.status_code == 500
    body = res.text
    assert "SECRET-INTERNAL-DETAIL" not in body
    assert "Traceback" not in body
    data = res.json()
    assert data["request_id"]
    assert res.headers["X-Request-Id"] == data["request_id"]


def test_unhandled_exception_hides_detail_even_with_debug_outside_dev(boom_route):
    with patch.object(settings, "DEBUG", True), patch.object(settings, "ENVIRONMENT", "production"):
        res = TestClient(app, raise_server_exceptions=False).get("/__p0_boom")
    assert "SECRET-INTERNAL-DETAIL" not in res.text


def test_validation_errors_are_422_and_do_not_echo_input():
    with client_as(make_user()) as (client, _db):
        res = client.post(
            "/api/admin/users",
            json={"name": "N", "email": "e@test.local", "role": "sales_rep", "password": "tiny-pw"},
        )
    assert res.status_code == 422
    for err in res.json()["details"]:
        assert set(err) == {"loc", "msg", "type"}
    assert "tiny-pw" not in res.text


def test_no_exception_text_returned_in_http_details():
    pattern = re.compile(r"detail\s*=\s*f?[\"'][^\"'\n]*\{(?:str\(e\)|e|exc|str\(exc\))\}")
    offenders = []
    for path in (APP_ROOT / "api").rglob("*.py"):
        for n, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            if pattern.search(line) or re.search(r"detail\s*=\s*str\((e|exc)\)", line):
                offenders.append(f"{path.name}:{n}: {line.strip()}")
    assert offenders == []


# ── WP-0.7: production configuration guards ─────────────────────────────────
def _settings(**kw):
    return Settings(_env_file=None, **kw)


GOOD = dict(SESSION_SECRET_KEY=STRONG, MIGRATION_KEY=STRONG + "1", CRON_SECRET=STRONG + "2")


def test_production_rejects_missing_secrets():
    with pytest.raises(ValidationError):
        _settings(ENVIRONMENT="production")


def test_app_env_alone_enables_production_safeguards():
    with pytest.raises(ValidationError):
        _settings(APP_ENV="production")
    with pytest.raises(ValidationError):
        _settings(APP_ENV="prod")


def test_production_rejects_short_and_known_bad_secrets():
    with pytest.raises(ValidationError):
        _settings(ENVIRONMENT="production", **{**GOOD, "SESSION_SECRET_KEY": "short"})
    # A known-bad value is detected by hash; here we only prove the check is wired to the list.
    import hashlib

    with patch("app.core.config.KNOWN_BAD_SECRET_HASHES", frozenset({hashlib.sha256(STRONG.encode()).hexdigest()})):
        with pytest.raises(ValidationError):
            _settings(ENVIRONMENT="production", **GOOD)


def test_production_accepts_strong_secrets_and_normalises_environment():
    s = _settings(APP_ENV="prod", **GOOD)
    assert s.ENVIRONMENT == "production" == s.APP_ENV
    assert not s.is_dev_like
    assert s.DEBUG is False


def test_non_dev_environment_wins_over_dev_one():
    s = _settings(ENVIRONMENT="development", APP_ENV="production", **GOOD)
    assert s.ENVIRONMENT == "production"


def test_development_defaults_work_and_debug_is_off():
    s = _settings()
    assert s.is_dev_like
    assert s.DEBUG is False


def test_known_bad_secrets_are_stored_hashed_only():
    assert len(KNOWN_BAD_SECRET_HASHES) >= 5
    assert all(re.fullmatch(r"[0-9a-f]{64}", h) for h in KNOWN_BAD_SECRET_HASHES)


# ── WP-0.8: correctness bugs ────────────────────────────────────────────────
class _Row(FakeResult):
    """FakeResult whose first() yields a SQLAlchemy-Row-like object (has ._mapping)."""

    def first(self):
        row = super().first()
        return SimpleNamespace(_mapping=row) if row is not None else None


def test_create_estimate_accepts_total_and_links_created_client():
    created = {}

    def insert_estimate(params):
        created.update(params)
        return _Row([{"id": 7, "estimate_number": params["est_num"], "client_id": params["client_id"], "total": params["total"]}])

    db = FakeDB([
        ("INSERT INTO estimates", insert_estimate),
        ("SELECT COUNT(*) FROM estimates", lambda p: FakeResult(scalar=0)),
    ])
    payload = {"customer_name": "Jane Doe", "customer_email": "jane@test.local", "total": 12345.0, "status": "draft"}
    with client_as(make_user(), db) as (client, _db), patch(
        "app.api.admin.estimates.find_or_create_client", new=AsyncMock(return_value=42)
    ) as foc, patch("app.api.admin.estimates.recalculate_client_stats", new=AsyncMock()):
        res = client.post("/api/admin/estimates", json=payload)
    assert res.status_code == 200, res.text
    assert created["total"] == 12345.0
    assert created["client_id"] == 42
    assert isinstance(foc.await_args.kwargs.get("zip", None), (str, type(None)))
    assert res.json()["estimate"]["client_id"] == 42


def test_estimate_handlers_do_not_use_dict_get_on_pydantic_models():
    src = (APP_ROOT / "api" / "admin" / "estimates.py").read_text(encoding="utf-8")
    assert "payload.get(" not in src.split("async def create_estimate", 1)[1].split("@router.get(\"/estimates/{estimate_id}\")", 1)[0]


def test_find_or_create_client_helper_is_not_used_as_a_dict():
    src = (APP_ROOT / "api" / "admin" / "estimates.py").read_text(encoding="utf-8")
    assert "except Exception:\n            pass\n\n    estimate_created_by" not in src
    assert 'client_row["id"]' not in src and "client_row.get(" not in src


def test_report_date_filter_binds_cast_instead_of_pg_double_colon_after_bind():
    from app.api.admin.reports import _get_date_filters

    clause, params = _get_date_filters("2026-01-01", "2026-01-31")
    assert "CAST(:filter_to AS DATE)" in clause
    assert ":filter_to::" not in clause
    assert params == {"filter_from": "2026-01-01", "filter_to": "2026-01-31"}
    # Malformed input is ignored rather than interpolated.
    assert _get_date_filters("x'; DROP TABLE users;--", None) == ("1=1", {})


def _contract_row(status="draft", version=3, signed_at=None):
    return {
        "id": 5, "status": status, "version": version, "client_initials": None, "signature_name": None,
        "signature_type": None, "signature_data": None, "client_signed_at": signed_at, "contract_data": {},
    }


def _autosave(user, row, update_row=None):
    db = FakeDB([
        ("FROM contracts WHERE id", lambda p: FakeResult([row] if row else [])),
        ("UPDATE contracts", lambda p: FakeResult([update_row] if update_row else [])),
    ])
    with client_as(user, db) as (client, db):
        res = client.put("/api/admin/contracts/5/draft", json={"contract_data": {"a": 1}})
    return res, db


def test_contract_autosave_returns_database_version():
    res, db = _autosave(make_user(), _contract_row(version=3), update_row={"version": 4})
    assert res.status_code == 200, res.text
    assert res.json()["version"] == 4
    assert db.ran("RETURNING version")


def test_contract_autosave_conflicts_when_row_no_longer_editable():
    res, _ = _autosave(make_user(), _contract_row(status="draft"), update_row=None)
    assert res.status_code == 409


def test_health_returns_503_when_dependency_is_down_and_200_when_healthy():
    client = TestClient(app, raise_server_exceptions=False)
    with patch("app.main._check_database", new=AsyncMock(return_value=True)), patch(
        "app.main._check_redis", new=AsyncMock(return_value=True)
    ):
        ok = client.get("/health")
    with patch("app.main._check_database", new=AsyncMock(return_value=False)), patch(
        "app.main._check_redis", new=AsyncMock(return_value=True)
    ):
        bad_db = client.get("/health")
    with patch("app.main._check_database", new=AsyncMock(return_value=True)), patch(
        "app.main._check_redis", new=AsyncMock(return_value=False)
    ):
        bad_redis = client.get("/")
    assert ok.status_code == 200 and ok.json()["status"] == "healthy"
    assert bad_db.status_code == 503 and bad_db.json()["database"] == "unreachable"
    assert bad_redis.status_code == 503 and bad_redis.json()["redis"] == "unreachable"


# ── WP-0.9: contracts / estimate file hardening ─────────────────────────────
def test_contract_autosave_requires_edit_permission():
    viewer = make_user(user_id=20, role="viewer", protected=False, permissions={"contracts.view": "all"})
    res, db = _autosave(viewer, _contract_row(), update_row={"version": 4})
    assert res.status_code == 403
    assert not db.ran("UPDATE contracts")


@pytest.mark.parametrize("status", ["sent", "client_signed", "signed", "voided"])
def test_contract_autosave_rejects_non_draft_contracts(status):
    res, db = _autosave(make_user(), _contract_row(status=status), update_row={"version": 4})
    assert res.status_code == 409
    assert not db.ran("UPDATE contracts")


def _draft_by_lead(user):
    row = {
        "id": 5, "lead_id": 9, "estimate_id": None, "client_id": None, "contract_number": "C-1",
        "status": "draft", "signing_token": "TOKEN-VALUE", "contract_data": {}, "is_archived": False,
        "created_at": None, "updated_at": None,
    }
    db = FakeDB([("FROM contracts", lambda p: FakeResult([row]))])
    with client_as(user, db) as (client, _db):
        return client.get("/api/admin/contracts/draft-by-lead/9")


def test_draft_by_lead_hides_signing_token_without_edit_permission():
    viewer = make_user(user_id=20, role="viewer", protected=False, permissions={"contracts.view": "all"})
    res = _draft_by_lead(viewer)
    assert res.status_code == 200
    assert "signing_token" not in res.json()["contract"]


def test_draft_by_lead_returns_signing_token_to_editors():
    res = _draft_by_lead(make_user())
    assert res.json()["contract"]["signing_token"] == "TOKEN-VALUE"


def test_contracts_edit_is_a_system_permission():
    from app.core.permissions import SYSTEM_PERMISSIONS

    keys = {p[0] for p in SYSTEM_PERMISSIONS}
    assert {"contracts.edit", "contracts.void"} <= keys


def test_estimate_pdf_filename_is_unguessable(tmp_path):
    from app.services import pdf_generator

    src = pathlib.Path(pdf_generator.__file__).read_text(encoding="utf-8")
    body = src.split("def save_estimate_pdf_file", 1)[1]
    assert "secrets.token_urlsafe" in body.split("\ndef ", 1)[0]


# ── WP-0.2 / WP-0.3: repository hygiene ─────────────────────────────────────
def test_no_live_api_key_in_tracked_source():
    repo = pathlib.Path(__file__).resolve().parents[2]
    pattern = re.compile(r"rup_live_[A-Za-z0-9_\-]{30,}")
    offenders = []
    for base in ("backend/app", "backend/scripts", "website/app", "website/lib"):
        for path in (repo / base).rglob("*"):
            if path.suffix in {".py", ".ts", ".tsx", ".js", ".html", ".md"} and path.is_file():
                if pattern.search(path.read_text(encoding="utf-8", errors="ignore")):
                    offenders.append(str(path.relative_to(repo)))
    assert offenders == []


def test_dockerignore_excludes_secrets_and_scratch():
    text = (pathlib.Path(__file__).resolve().parents[1] / ".dockerignore").read_text(encoding="utf-8")
    lines = {l.strip() for l in text.splitlines()}
    assert {".env", ".env.*", "scratch/", "tests/", ".venv"} <= lines


def test_seed_dev_refuses_non_dev_environment_and_weak_credentials():
    import importlib.util

    path = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "seed_dev.py"
    spec = importlib.util.spec_from_file_location("seed_dev", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    with patch.object(mod.settings, "ENVIRONMENT", "production"):
        with pytest.raises(SystemExit):
            mod.assert_dev_environment()
    with pytest.raises(SystemExit):
        mod.read_seed_credentials({"SEED_OWNER_EMAIL": "a@b.test", "SEED_OWNER_PASSWORD": "short"})
    with pytest.raises(SystemExit):
        mod.read_seed_credentials({"SEED_OWNER_EMAIL": "", "SEED_OWNER_PASSWORD": "long-enough-password"})
    assert mod.read_seed_credentials(
        {"SEED_OWNER_EMAIL": "A@B.test", "SEED_OWNER_PASSWORD": "long-enough-password"}
    )[:2] == ("a@b.test", "long-enough-password")
