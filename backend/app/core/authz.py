from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import Forbidden, Unauthenticated


@dataclass
class Principal:
    """Represents the authenticated actor (user or API key service account)."""

    id: int | str
    role: str
    kind: str = "user"  # "user" | "api_key"
    name: str = ""
    email: str = ""
    permissions: dict[str, str] = field(default_factory=dict)
    is_protected_owner: bool = False
    api_key_id: int | None = None
    user_id: int | None = None

    def scope_for(self, permission: str) -> str:
        """Returns the scope ('all', 'assigned', 'own', 'none') for the given permission."""
        if self.role == "owner" or self.is_protected_owner or self.permissions.get("*") == "all":
            return "all"
        canonical = permission.replace(":", ".")
        if canonical in self.permissions:
            return self.permissions[canonical]
        prefix = canonical.split(".", 1)[0]
        if f"{prefix}.*" in self.permissions:
            return self.permissions[f"{prefix}.*"]
        return "none"

    def has_permission(self, permission: str, required_scope: str | None = None) -> bool:
        """Checks if the principal holds the requested permission with sufficient scope."""
        scope = self.scope_for(permission)
        if scope == "none":
            return False
        if not required_scope:
            return True
        scope_hierarchy = {"own": 1, "assigned": 2, "all": 3}
        return scope_hierarchy.get(scope, 0) >= scope_hierarchy.get(required_scope, 0)


def ensure_owns(
    principal: Principal,
    resource: Any,
    permission: str | None = None,
    owner_field: str | None = None,
) -> None:
    """
    Validates ownership of a resource under the principal's permission scope.
    Owners and principals with 'all' scope bypass the ownership check.
    Raises Forbidden if the principal cannot access the record.
    """
    if principal.role == "owner" or principal.is_protected_owner:
        return

    if permission:
        scope = principal.scope_for(permission)
    else:
        scope = "all"

    if scope == "all":
        return
    if scope == "none":
        raise Forbidden(f"Insufficient permissions for {permission or 'resource'}")

    # API keys are evaluated strictly by scope ('all') and cannot claim personal ownership of human records
    if principal.kind == "api_key":
        raise Forbidden("API keys cannot access user-scoped records without 'all' scope.")

    resource_owner_id = None
    if owner_field:
        if isinstance(resource, dict):
            resource_owner_id = resource.get(owner_field)
        else:
            resource_owner_id = getattr(resource, owner_field, None)
    else:
        candidates = (
            "assigned_to",
            "assigned_to_user_id",
            "sales_rep_id",
            "created_by",
            "created_by_user_id",
            "user_id",
        )
        for attr in candidates:
            val = resource.get(attr) if isinstance(resource, dict) else getattr(resource, attr, None)
            if val is not None:
                resource_owner_id = val
                break

    if resource_owner_id is not None:
        if int(resource_owner_id) != int(principal.id):
            raise Forbidden("You do not have permission to access or modify this record.")
        return

    # If the resource has an associated lead dict/object, inspect lead ownership
    lead = resource.get("lead") if isinstance(resource, dict) else getattr(resource, "lead", None)
    if lead is not None:
        lead_assigned = lead.get("assigned_to") if isinstance(lead, dict) else getattr(lead, "assigned_to", None)
        if lead_assigned is not None:
            if int(lead_assigned) != int(principal.id):
                raise Forbidden("You do not have permission to access or modify this record.")
            return

    raise Forbidden("Cannot verify record ownership for restricted user.")


def require(permission: str, required_scope: str | None = None) -> Callable[..., Any]:
    """FastAPI dependency requiring an authenticated Principal with specified permission."""

    async def dependency(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ) -> Principal:
        from app.middlewares.auth import get_optional_current_user

        auth_user = await get_optional_current_user(request, db)
        if not auth_user:
            raise Unauthenticated("Authentication required")

        principal = Principal(
            id=f"key:{auth_user.api_key_id}" if auth_user.is_api_key else auth_user.id,
            role=auth_user.role,
            kind="api_key" if auth_user.is_api_key else "user",
            name=auth_user.name,
            email=auth_user.email,
            permissions=auth_user.permissions,
            is_protected_owner=auth_user.is_protected_owner,
            api_key_id=auth_user.api_key_id,
            user_id=None if auth_user.is_api_key else auth_user.id,
        )

        canonical = permission.replace(":", ".")
        if not principal.has_permission(canonical, required_scope):
            raise Forbidden(f"Insufficient permissions: {permission} required")

        return principal

    return dependency


async def require_auth_principal(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Principal:
    """FastAPI dependency requiring any valid authenticated Principal."""
    from app.middlewares.auth import get_optional_current_user

    auth_user = await get_optional_current_user(request, db)
    if not auth_user:
        raise Unauthenticated("Authentication required")

    return Principal(
        id=f"key:{auth_user.api_key_id}" if auth_user.is_api_key else auth_user.id,
        role=auth_user.role,
        kind="api_key" if auth_user.is_api_key else "user",
        name=auth_user.name,
        email=auth_user.email,
        permissions=auth_user.permissions,
        is_protected_owner=auth_user.is_protected_owner,
        api_key_id=auth_user.api_key_id,
        user_id=None if auth_user.is_api_key else auth_user.id,
    )

