"""
Route inventory test (WP-2.3: Permanent Guard).
Enforces:
  1. Every route is either authenticated OR explicitly registered in public_routes.py with a reason.
  2. No stale entries exist in public_routes.py.
  3. No route uses an un-called dependency factory (e.g. Depends(require_permission) instead of Depends(require_permission(...))).
"""
import inspect
from typing import List, Set, Tuple, Callable
import pytest
from fastapi.routing import APIRoute

from app.main import app
from tests.public_routes import PUBLIC_ROUTES


AUTH_DEPENDENCY_NAMES = {
    "require_auth",
    "require_permission",
    "require_any_permission",
    "require_api_key",
    "require_developer_session",
    "require_developer_auth",
    "developer_session",
    "dependency",  # closure name returned by require_permission(...)
    "get_optional_current_user",
}

# Known dependency factory functions that MUST be called before passing to Depends()
KNOWN_DEPENDENCY_FACTORIES = {
    "require_permission",
    "require_any_permission",
    "require_auth_user",
    "rate_limit",
}


def _get_all_dependency_callables(dependant) -> List[Callable]:
    """Recursively collect all callables in a FastAPI dependant tree."""
    calls = []
    if dependant.call:
        calls.append(dependant.call)
    for sub in dependant.dependencies:
        calls.extend(_get_all_dependency_callables(sub))
    return calls


def _route_has_auth(route: APIRoute) -> bool:
    """Check if a route has an authentication/authorization dependency in its tree."""
    calls = _get_all_dependency_callables(route.dependant)
    call_names = set(getattr(c, "__name__", str(c)) for c in calls)

    if bool(call_names & AUTH_DEPENDENCY_NAMES):
        return True

    # Check module provenance of dependencies
    for c in calls:
        mod = getattr(c, "__module__", "")
        if any(term in mod for term in ("permission", "auth", "security", "developer_auth")):
            return True
    return False


def test_every_route_is_authenticated_or_allowlisted():
    """
    Ensure every route has authentication or is explicitly listed in public_routes.py.
    Fails on unauthenticated routes not in the allowlist.
    """
    unauthenticated_routes: Set[Tuple[str, str]] = set()

    for route in app.routes:
        if isinstance(route, APIRoute):
            if not _route_has_auth(route):
                for method in (route.methods - {"HEAD", "OPTIONS"}):
                    unauthenticated_routes.add((method, route.path))

    unlisted_routes = unauthenticated_routes - set(PUBLIC_ROUTES.keys())

    assert not unlisted_routes, (
        f"Found {len(unlisted_routes)} unauthenticated routes not documented in "
        f"tests/public_routes.py:\n" +
        "\n".join(f"  {m:6} {p}" for m, p in sorted(unlisted_routes)) +
        "\n\nEvery route must have authentication (e.g. Depends(require_permission(...))) "
        "or be explicitly justified in tests/public_routes.py."
    )


def test_no_stale_entries_in_public_routes_allowlist():
    """
    Ensure that every entry in public_routes.py corresponds to an actual registered route.
    Prevents the allowlist from rotting over time.
    """
    existing_routes: Set[Tuple[str, str]] = set()
    for route in app.routes:
        if isinstance(route, APIRoute):
            for method in (route.methods - {"HEAD", "OPTIONS"}):
                existing_routes.add((method, route.path))

    stale_entries = set(PUBLIC_ROUTES.keys()) - existing_routes

    assert not stale_entries, (
        f"Found {len(stale_entries)} stale entries in tests/public_routes.py that do not exist:\n" +
        "\n".join(f"  {m:6} {p}" for m, p in sorted(stale_entries))
    )


def test_no_uncalled_dependency_factories():
    """
    Permanent guard against the missing-() bug (Depends(factory) instead of Depends(factory(...))).
    Inspects all route dependencies and asserts none are uncalled factory functions.
    """
    violations = []

    for route in app.routes:
        if isinstance(route, APIRoute):
            for dep in route.dependant.dependencies:
                call = dep.call
                if callable(call):
                    func_name = getattr(call, "__name__", "")
                    if func_name in KNOWN_DEPENDENCY_FACTORIES:
                        violations.append((route.path, func_name))
                    elif inspect.isfunction(call):
                        # Inspect return type annotation or docstring
                        ret = inspect.signature(call).return_annotation
                        if ret in (Callable, "Callable"):
                            violations.append((route.path, func_name))

    assert not violations, (
        f"Found un-called dependency factories in route dependencies:\n" +
        "\n".join(f"  {p} -> Depends({name}) [missing ()!]" for p, name in violations)
    )


def test_detects_uncalled_dependency_factory_reversion():
    """
    Proves that if the missing-() bug is ever introduced, it is caught immediately.
    Constructs a dummy APIRoute with Depends(require_permission) uncalled.
    """
    from fastapi import Depends
    from app.core.permissions import require_permission

    def buggy_endpoint(perm = Depends(require_permission)):
        return {"ok": True}

    buggy_route = APIRoute("/api/buggy", buggy_endpoint)
    violations = []
    for dep in buggy_route.dependant.dependencies:
        if callable(dep.call) and getattr(dep.call, "__name__", "") in KNOWN_DEPENDENCY_FACTORIES:
            violations.append(("/api/buggy", dep.call.__name__))

    assert len(violations) == 1
    assert violations[0] == ("/api/buggy", "require_permission")

