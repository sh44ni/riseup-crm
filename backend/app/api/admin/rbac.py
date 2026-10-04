from datetime import datetime, timedelta
import secrets
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.logger import get_logger
from app.core.security import hash_scrypt_password
from app.core.audit import record_audit_log
from app.core.redis import invalidate_session_cache
from app.middlewares.auth import require_auth, require_permission
from app.core.config import settings
from app.services.email_service import send_team_invitation_email

logger = get_logger(__name__)
router = APIRouter(prefix="/api/admin", tags=["RBAC & Users"])

# ── Module Config Mapping for User-Friendly Role Studio ─────────────────────
MODULE_CONFIG_MAP = {
    "leads": {
        "view_key": "leads.view",
        "scoped": True,
        "manage_keys": ["leads.create", "leads.edit", "leads.delete", "leads.claim", "leads.reassign"]
    },
    "clients": {
        "view_key": "clients.view",
        "scoped": True,
        "manage_keys": ["clients.create", "clients.edit", "clients.delete"]
    },
    "pipeline": {
        "view_key": "pipeline.view",
        "scoped": True,
        "manage_keys": ["pipeline.advance_stage", "pipeline.override_gate"]
    },
    "estimates": {
        "view_key": "estimates.view",
        "scoped": True,
        "manage_keys": ["estimates.create", "estimates.send", "estimates.edit_pricing_templates"]
    },
    "contracts": {
        "view_key": "contracts.view",
        "scoped": False,
        "manage_keys": ["contracts.edit", "contracts.void"]
    },
    "jobs": {
        "view_key": "jobs.view",
        "scoped": True,
        "manage_keys": ["jobs.edit", "jobs.mark_complete"]
    },
    "calendar": {
        "view_key": "calendar.view",
        "scoped": True,
        "manage_keys": ["calendar.create_event", "calendar.view_others"]
    },
    "inspections": {
        "view_key": "inspections.view",
        "scoped": False,
        "manage_keys": ["inspections.create", "inspections.edit_checklist_templates"]
    },
    "finances": {
        "view_key": "finances.view",
        "scoped": False,
        "manage_keys": ["finances.edit"]
    },
    "reports": {
        "view_key": "reports.view",
        "scoped": False,
        "manage_keys": []
    },
    "warranties": {
        "view_key": "warranties.view",
        "scoped": False,
        "manage_keys": ["warranties.create", "warranties.edit"]
    },
    "estimator_settings": {
        "view_key": "estimator_settings.view",
        "scoped": False,
        "manage_keys": ["estimator_settings.edit"]
    },
    "roles": {
        "view_key": "roles.view",
        "scoped": False,
        "manage_keys": ["roles.create", "roles.edit", "roles.delete", "roles.assign_permissions"]
    },
    "users": {
        "view_key": "users.view",
        "scoped": False,
        "manage_keys": ["users.invite", "users.deactivate", "users.assign_roles"]
    }
}

def role_permissions_to_modules(role_perms: List[dict], is_protected: bool = False, role_name: str = "") -> Dict[str, dict]:
    modules = {}
    if (role_name or "").strip().lower() == "owner":
        for mod_key in MODULE_CONFIG_MAP:
            modules[mod_key] = {"view": "all", "manage": True}
        return modules

    perm_map = {p.get("key"): p.get("scope", "all") for p in role_perms if p.get("key")}
    for mod_key, cfg in MODULE_CONFIG_MAP.items():
        view_scope = perm_map.get(cfg["view_key"], "none")
        has_manage = any(k in perm_map for k in cfg["manage_keys"]) if cfg["manage_keys"] else False
        if view_scope == "none":
            has_manage = False
        modules[mod_key] = {
            "view": view_scope,
            "manage": has_manage
        }
    return modules

def modules_to_role_permissions(modules: Dict[str, dict], all_perms_by_key: Dict[str, int]) -> List[dict]:
    result = []
    for mod_key, mod_cfg in modules.items():
        meta = MODULE_CONFIG_MAP.get(mod_key)
        if not meta:
            continue
        view_val = (mod_cfg.get("view") or "none").lower()
        manage_val = bool(mod_cfg.get("manage"))

        if view_val != "none":
            vid = all_perms_by_key.get(meta["view_key"])
            if vid:
                scope = view_val if meta["scoped"] else "all"
                if scope not in ("own", "assigned", "all"):
                    scope = "all"
                result.append({"permission_id": vid, "scope": scope})

            if manage_val:
                manage_scope = view_val if meta["scoped"] else "all"
                if manage_scope not in ("own", "assigned", "all"):
                    manage_scope = "all"
                for m_key in meta["manage_keys"]:
                    mid = all_perms_by_key.get(m_key)
                    if mid:
                        result.append({"permission_id": mid, "scope": manage_scope})
    return result

def normalize_permissions_payload(raw_perms, all_perms_by_key: Dict[str, int]) -> List[dict]:
    if isinstance(raw_perms, dict):
        result = []
        for k, scope in raw_perms.items():
            pid = all_perms_by_key.get(k)
            if pid and scope != "none":
                result.append({"permission_id": pid, "scope": scope if scope in ("own", "assigned", "all") else "all"})
        return result
    elif isinstance(raw_perms, list):
        result = []
        for p in raw_perms:
            if isinstance(p, dict):
                pid = p.get("permission_id") or all_perms_by_key.get(p.get("key"))
                scope = p.get("scope") or "all"
                if pid and scope != "none":
                    result.append({"permission_id": pid, "scope": scope if scope in ("own", "assigned", "all") else "all"})
        return result
    return []

# ── Permissions ─────────────────────────────────────────────────────────────
@router.get("/permissions", dependencies=[Depends(require_auth)])
async def list_permissions(db: AsyncSession = Depends(get_db)):
    sql = text("SELECT id, key, resource, action, description FROM permissions ORDER BY resource ASC, action ASC")
    rows = (await db.execute(sql)).mappings().all()
    return {"permissions": [dict(r) for r in rows]}

# ── Roles ───────────────────────────────────────────────────────────────────
@router.get("/roles", dependencies=[Depends(require_permission("roles.view"))])
async def list_roles(db: AsyncSession = Depends(get_db)):
    sql = text("""
        SELECT r.id, r.name, r.description, r.is_protected, r.is_authorized_signatory, r.created_at,
               COALESCE(json_agg(json_build_object('permission_id', rp.permission_id, 'key', p.key, 'scope', rp.scope)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        GROUP BY r.id
        ORDER BY r.id ASC
    """)
    rows = (await db.execute(sql)).mappings().all()
    roles = []
    for r in rows:
        d = dict(r)
        d["modules"] = role_permissions_to_modules(d.get("permissions") or [], d.get("is_protected", False), d.get("name", ""))
        roles.append(d)
    return {"roles": roles}

@router.post("/roles", dependencies=[Depends(require_permission("roles.create"))])
async def create_role(request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = await request.json()
    name = (body.get("name") or "").strip()
    description = body.get("description")
    is_authorized_signatory = bool(body.get("is_authorized_signatory", False))
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    if name.lower() in ("owner", "administrator", "admin"):
        raise HTTPException(status_code=400, detail="Cannot create role with reserved system name")

    insert_sql = text("""
        INSERT INTO roles (name, description, is_protected, is_authorized_signatory, created_by, created_at, updated_at)
        VALUES (:name, :desc, false, :auth_sig, :uid, NOW(), NOW())
        RETURNING id, name, description, is_protected, is_authorized_signatory
    """)
    try:
        res = (await db.execute(insert_sql, {"name": name, "desc": description, "auth_sig": is_authorized_signatory, "uid": user.id})).mappings().first()
        role_id = res["id"]

        all_perms = (await db.execute(text("SELECT id, key FROM permissions"))).mappings().all()
        all_perms_map = {p["key"]: p["id"] for p in all_perms}

        # If high-level modules provided, resolve to granular permissions
        if "modules" in body and isinstance(body["modules"], dict):
            perms = modules_to_role_permissions(body["modules"], all_perms_map)
        elif "permissions" in body and body["permissions"] is not None:
            perms = normalize_permissions_payload(body["permissions"], all_perms_map)
        else:
            perms = []

        for p in perms:
            p_id = p.get("permission_id")
            scope = p.get("scope") or "all"
            if p_id:
                await db.execute(text("INSERT INTO role_permissions (role_id, permission_id, scope) VALUES (:rid, :pid, :scope)"), {"rid": role_id, "pid": p_id, "scope": scope})

        await db.commit()
        await invalidate_session_cache()
        await record_audit_log(db, "role.create", "role", role_id, user.id, user.email, user.role, body, request)

        sql = text("""
            SELECT r.id, r.name, r.description, r.is_protected, r.is_authorized_signatory, r.created_at,
                   COALESCE(json_agg(json_build_object('permission_id', rp.permission_id, 'key', p.key, 'scope', rp.scope)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
            FROM roles r
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
            LEFT JOIN permissions p ON rp.permission_id = p.id
            WHERE r.id = :id
            GROUP BY r.id
        """)
        new_role = (await db.execute(sql, {"id": role_id})).mappings().first()
        d = dict(new_role)
        d["modules"] = role_permissions_to_modules(d.get("permissions") or [], d.get("is_protected", False), d.get("name", ""))
        return {"ok": True, "role": d}
    except Exception:
        await db.rollback()
        logger.exception("Failed to create role")
        raise HTTPException(status_code=400, detail="Could not create role")

@router.put("/roles/{role_id}", dependencies=[Depends(require_permission("roles.edit"))])
async def update_role(role_id: int, request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = await request.json()
    role = (await db.execute(text("SELECT id, is_protected, name, description FROM roles WHERE id = :id"), {"id": role_id})).mappings().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    caller_is_owner = _is_owner(user)
    role_name_lower = (role["name"] or "").strip().lower()
    is_owner_role = role_name_lower == "owner"
    is_admin_role = role_name_lower in ("administrator", "admin")
    is_system_role = bool(role["is_protected"]) or is_owner_role or is_admin_role

    # 1. Renaming protection: neither Owner nor Administrator can be renamed
    name = body.get("name")
    if is_system_role:
        if name and name.strip().lower() != role["name"].lower():
            raise HTTPException(status_code=403, detail="Cannot rename permanent system role")
    else:
        if name and name.strip():
            await db.execute(text("UPDATE roles SET name = :name, updated_at = NOW() WHERE id = :id"), {"name": name.strip(), "id": role_id})

    # 2. Permission & settings editing:
    # - Owner role permissions are permanent root (* -> all)
    # - Administrator role is protected from other admins: only the Owner can modify administrator permissions
    if is_owner_role:
        # Owner role permissions cannot be altered
        pass
    elif is_admin_role:
        if not caller_is_owner:
            raise HTTPException(status_code=403, detail="Only the owner can modify administrator permissions")

    description = body.get("description")
    if description is not None:
        if is_admin_role and not caller_is_owner:
            raise HTTPException(status_code=403, detail="Only the owner can modify administrator role details")
        await db.execute(text("UPDATE roles SET description = :desc, updated_at = NOW() WHERE id = :id"), {"desc": description, "id": role_id})

    if "is_authorized_signatory" in body:
        if is_admin_role and not caller_is_owner:
            raise HTTPException(status_code=403, detail="Only the owner can modify administrator signatory authority")
        if not is_owner_role:
            is_auth = bool(body["is_authorized_signatory"])
            await db.execute(text("UPDATE roles SET is_authorized_signatory = :is_auth, updated_at = NOW() WHERE id = :id"), {"is_auth": is_auth, "id": role_id})

    # 3. Resolve permissions for non-owner roles (if admin_role, caller_is_owner was already validated above)
    if not is_owner_role:
        all_perms = (await db.execute(text("SELECT id, key FROM permissions"))).mappings().all()
        all_perms_map = {p["key"]: p["id"] for p in all_perms}

        if "modules" in body and isinstance(body["modules"], dict):
            permissions = modules_to_role_permissions(body["modules"], all_perms_map)
        elif "permissions" in body and body["permissions"] is not None:
            permissions = normalize_permissions_payload(body["permissions"], all_perms_map)
        else:
            permissions = None

        if permissions is not None:
            await db.execute(text("DELETE FROM role_permissions WHERE role_id = :id"), {"id": role_id})
            for p in permissions:
                p_id = p.get("permission_id")
                scope = p.get("scope") or "all"
                if p_id:
                    await db.execute(text("""
                        INSERT INTO role_permissions (role_id, permission_id, scope)
                        VALUES (:rid, :pid, :scope)
                        ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
                    """), {"rid": role_id, "pid": p_id, "scope": scope})

    await db.commit()
    await invalidate_session_cache()

    sql = text("""
        SELECT r.id, r.name, r.description, r.is_protected, r.is_authorized_signatory, r.created_at,
               COALESCE(json_agg(json_build_object('permission_id', rp.permission_id, 'key', p.key, 'scope', rp.scope)) FILTER (WHERE p.id IS NOT NULL), '[]') as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.id = :id
        GROUP BY r.id
    """)
    updated_role = (await db.execute(sql, {"id": role_id})).mappings().first()
    d = dict(updated_role)
    d["modules"] = role_permissions_to_modules(d.get("permissions") or [], d.get("is_protected", False), d.get("name", ""))
    await record_audit_log(db, "role.update", "role", role_id, user.id, user.email, user.role, body, request)
    return {"ok": True, "role": d}

@router.delete("/roles/{role_id}", dependencies=[Depends(require_permission("roles.delete"))])
async def delete_role(role_id: int, request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    role = (await db.execute(text("SELECT is_protected, name FROM roles WHERE id = :id"), {"id": role_id})).mappings().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    name_lower = (role["name"] or "").strip().lower()
    if role["is_protected"] or name_lower in ("owner", "administrator", "admin"):
        raise HTTPException(status_code=403, detail="Cannot delete protected system role")

    await db.execute(text("DELETE FROM roles WHERE id = :id"), {"id": role_id})
    await db.commit()
    await invalidate_session_cache()
    await record_audit_log(db, "role.delete", "role", role_id, user.id, user.email, user.role, {"deletedRole": role["name"]}, request)
    return {"ok": True}

# ── Users ───────────────────────────────────────────────────────────────────
@router.get("/users", dependencies=[Depends(require_permission("users.view"))])
async def list_users(db: AsyncSession = Depends(get_db)):
    sql = text("""
        SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar_url,
               u.signature_data, u.signature_type, u.signature_title,
               u.last_login_at, u.created_at,
               COALESCE(json_agg(json_build_object('id', r.id, 'name', r.name, 'is_protected', r.is_protected, 'is_authorized_signatory', r.is_authorized_signatory)) FILTER (WHERE r.id IS NOT NULL), '[]') as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id
        ORDER BY u.name ASC
    """)
    rows = (await db.execute(sql)).mappings().all()
    users = []
    for r in rows:
        d = dict(r)
        assigned_roles = d.get("roles") or []
        d["is_authorized_signatory"] = any(bool(role.get("is_authorized_signatory")) for role in assigned_roles)
        d["has_signature"] = bool(d.get("signature_data"))
        users.append(d)
    return {"users": users}

MIN_PASSWORD_LENGTH = 12
ALLOWED_USER_STATUSES = ("active", "suspended", "deactivated", "inactive", "pending")


class CreateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=320)
    phone: Optional[str] = Field(default=None, max_length=50)
    role: Optional[str] = Field(default=None, max_length=100)
    role_id: Optional[int] = None
    password: Optional[str] = Field(default=None, max_length=256)

    @field_validator("name", "email")
    @classmethod
    def _strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("password")
    @classmethod
    def _password_policy(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
        return v


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = None
    avatar_url: Optional[str] = Field(default=None, max_length=2048)
    role: Optional[str] = Field(default=None, max_length=100)
    role_id: Optional[int] = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_USER_STATUSES:
            raise ValueError("Invalid status")
        return v


def _is_owner(user: Any) -> bool:
    """Only protected owners (or the legacy `owner` role) may manage owner-level access."""
    return bool(getattr(user, "is_protected_owner", False) or getattr(user, "role", None) == "owner")


def _forbid_owner_management(detail: str = "Only an owner can manage owner-level access") -> HTTPException:
    return HTTPException(status_code=403, detail=detail)


async def _resolve_role(db: AsyncSession, role_id: Optional[int], role_name: Optional[str]) -> Optional[dict]:
    """Looks a role up by id or name/slug against the roles table. Returns None if unknown."""
    if role_id is not None:
        row = (await db.execute(
            text("SELECT id, name, is_protected FROM roles WHERE id = :rid"), {"rid": role_id}
        )).mappings().first()
    elif role_name:
        row = (await db.execute(text("""
            SELECT id, name, is_protected FROM roles
            WHERE LOWER(name) = LOWER(:r)
               OR LOWER(REPLACE(name, ' ', '_')) = LOWER(REPLACE(:r, ' ', '_'))
            LIMIT 1
        """), {"r": role_name.strip()})).mappings().first()
    else:
        return None
    return dict(row) if row else None


def _is_owner_role(role: dict) -> bool:
    return str(role.get("name", "")).strip().lower() == "owner"


def _is_admin_role(role: dict) -> bool:
    return str(role.get("name", "")).strip().lower() in ("administrator", "admin")


def _is_elevated_role(role: dict) -> bool:
    return _is_owner_role(role) or _is_admin_role(role) or bool(role.get("is_protected"))


@router.post("/users", dependencies=[Depends(require_permission("users.assign_roles"))])
async def create_user(body: CreateUserRequest, request: Request, db: AsyncSession = Depends(get_db), current_user = Depends(require_auth)):
    email = body.email.lower()

    role = await _resolve_role(db, body.role_id, body.role or ("sales_rep" if body.role_id is None else None))
    if not role:
        raise HTTPException(status_code=400, detail="Unknown role")
    if _is_elevated_role(role) and not _is_owner(current_user):
        raise HTTPException(status_code=403, detail="Only the owner can assign administrator or owner roles")

    if body.password is None:
        # No password supplied: onboard through the invitation flow, never a default password.
        invitation = await _issue_invitation(db, request, current_user, email, [role["id"]])
        return {"ok": True, "invited": True, **invitation}

    p_hash, salt = hash_scrypt_password(body.password)
    role_slug = str(role["name"]).lower().replace(" ", "_")
    try:
        new_u = (await db.execute(text("""
            INSERT INTO users (name, email, phone, role, password_hash, salt, status, created_at, updated_at)
            VALUES (:name, :email, :phone, :role, :phash, :salt, 'active', NOW(), NOW())
            RETURNING id, name, email, phone, role, status
        """), {
            "name": body.name, "email": email, "phone": body.phone,
            "role": role_slug, "phash": p_hash, "salt": salt,
        })).mappings().first()

        await db.execute(
            text("INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (:uid, :rid, :by)"),
            {"uid": new_u["id"], "rid": role["id"], "by": current_user.id},
        )
        await db.commit()
        await invalidate_session_cache()
        await record_audit_log(db, "user.create", "user", new_u["id"], current_user.id, current_user.email, current_user.role, {"created": email, "role": role_slug}, request)
        return {"ok": True, "user": dict(new_u)}
    except Exception:
        await db.rollback()
        logger.exception("Failed to create user")
        raise HTTPException(status_code=400, detail="Could not create user")

@router.put("/users/{user_id}", dependencies=[Depends(require_permission("users.assign_roles"))])
async def update_user(user_id: int, body: UpdateUserRequest, request: Request, db: AsyncSession = Depends(get_db), current_user = Depends(require_auth)):
    target = (await db.execute(text("""
        SELECT u.id, u.role,
               EXISTS (
                   SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                   WHERE ur.user_id = u.id AND (r.name = 'Owner' OR u.role = 'owner')
               ) AS is_owner,
               EXISTS (
                   SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
                   WHERE ur.user_id = u.id AND (LOWER(r.name) IN ('administrator', 'admin') OR u.role IN ('admin', 'administrator'))
               ) AS is_admin
        FROM users u WHERE u.id = :id
    """), {"id": user_id})).mappings().first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    caller_is_owner = _is_owner(current_user)
    target_is_owner = bool(target.get("is_owner") or target.get("role") == "owner" or target.get("is_protected"))
    target_is_admin = bool(target.get("is_admin") or target.get("role") in ("admin", "administrator"))
    wants_role_change = body.role is not None or body.role_id is not None
    is_self = user_id == current_user.id

    # Guard: protected Owner accounts can only have role/status changed by an owner.
    if target_is_owner and not caller_is_owner:
        raise _forbid_owner_management()

    # Guard: Administrator accounts can only have role or status changed by an owner.
    # "an admin cant change what other admin can see, but the owner can do it"
    if target_is_admin and not caller_is_owner and (wants_role_change or body.status is not None):
        raise HTTPException(status_code=403, detail="Only the owner can change an administrator's role or status")

    updates = []
    params: Dict[str, Any] = {"id": user_id}
    for field in ("name", "phone", "status", "avatar_url"):
        if field in body.model_fields_set:
            updates.append(f"{field} = :{field}")
            params[field] = getattr(body, field)

    if wants_role_change:
        new_role = await _resolve_role(db, body.role_id, body.role)
        if not new_role:
            raise HTTPException(status_code=400, detail="Unknown role")
        new_slug = str(new_role["name"]).lower().replace(" ", "_")

        if new_slug != target["role"]:
            if is_self:
                raise HTTPException(status_code=403, detail="You cannot change your own role")
            if (_is_elevated_role(new_role) or target_is_owner or target_is_admin) and not caller_is_owner:
                raise HTTPException(status_code=403, detail="Only the owner can assign or alter administrator/owner roles")
            if target_is_owner and not _is_owner_role(new_role):
                other_owners = (await db.execute(text("""
                    SELECT COUNT(DISTINCT u.id) FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON r.id = ur.role_id
                    WHERE r.name = 'Owner' AND u.status = 'active' AND u.id <> :id
                """), {"id": user_id})).scalar() or 0
                if other_owners < 1:
                    raise HTTPException(status_code=409, detail="At least one active owner is required")
            updates.append("role = :role")
            params["role"] = new_slug
            # Only replace the user's roles when a new, validated role was supplied.
            await db.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": user_id})
            await db.execute(
                text("INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (:uid, :rid, :by)"),
                {"uid": user_id, "rid": new_role["id"], "by": current_user.id},
            )

    if updates:
        sql = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE id = :id RETURNING id, name, email, role, status"
        updated = (await db.execute(text(sql), params)).mappings().first()
        await db.commit()
        await invalidate_session_cache()
        await record_audit_log(db, "user.update", "user", user_id, current_user.id, current_user.email, current_user.role, body.model_dump(exclude_unset=True), request)
        return {"ok": True, "user": dict(updated)}

    return {"ok": True}

# ── Invitations ─────────────────────────────────────────────────────────────
@router.get("/invitations", dependencies=[Depends(require_permission("users.invite"))])
async def list_invitations(db: AsyncSession = Depends(get_db)):
    sql = text("""
        SELECT i.id, i.email, i.invited_role_ids, i.status, i.expires_at, i.created_at,
               u.name as invited_by_name,
               COALESCE((
                   SELECT json_agg(json_build_object('id', r.id, 'name', r.name))
                   FROM roles r
                   WHERE r.id = ANY(i.invited_role_ids)
               ), '[]') as roles
        FROM invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        WHERE i.status = 'pending'
          AND i.expires_at > NOW()
        ORDER BY i.created_at DESC
    """)
    rows = (await db.execute(sql)).mappings().all()
    return {"invitations": [dict(r) for r in rows]}

async def _issue_invitation(db: AsyncSession, request: Request, user: Any, email: str, role_ids: List[int]) -> dict:
    """Validates, stores and emails an invitation. Shared by /invitations and /users."""
    if role_ids:
        role_rows = (await db.execute(
            text("SELECT id, name, is_protected FROM roles WHERE id = ANY(:rids)"), {"rids": role_ids}
        )).mappings().all()
        if len(role_rows) != len(set(role_ids)):
            raise HTTPException(status_code=400, detail="Unknown role")
        if any(_is_elevated_role(dict(r)) for r in role_rows) and not _is_owner(user):
            raise HTTPException(status_code=403, detail="Only the owner can invite administrators or owners")

    # Check if a user with this email is already active
    existing_user = (await db.execute(text("SELECT id, status FROM users WHERE LOWER(email) = :e"), {"e": email})).mappings().first()
    if existing_user and existing_user["status"] == "active":
        raise HTTPException(status_code=400, detail="A team member with this email address is already active.")

    # Block duplicate pending invitations for the same email
    existing_invite = (await db.execute(
        text("""
            SELECT id, expires_at FROM invitations
            WHERE LOWER(email) = :e
              AND status NOT IN ('accepted', 'revoked')
              AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"e": email}
    )).mappings().first()
    if existing_invite:
        raise HTTPException(
            status_code=400,
            detail=f"A pending invitation for {email} already exists (ID: {existing_invite['id']}). Use 'Resend' to send them a new link instead."
        )

    if not role_ids:
        # Default to Sales Representative (id 3) or Door Knocker (id 4)
        dk_id = (await db.execute(text("SELECT id FROM roles WHERE LOWER(name) LIKE '%sales%' OR LOWER(name) LIKE '%knocker%' LIMIT 1"))).scalar()
        role_ids = [dk_id] if dk_id else [3]

    token = secrets.token_hex(24)
    expires = datetime.now() + timedelta(days=7)

    sql = text("""
        INSERT INTO invitations (email, invited_role_ids, invited_by, token, status, expires_at, created_at)
        VALUES (:email, :rids, :by, :tok, 'pending', :exp, NOW())
        RETURNING id, email, status, expires_at
    """)
    inv = (await db.execute(sql, {
        "email": email, "rids": role_ids, "by": user.id, "tok": token, "exp": expires
    })).mappings().first()
    await db.commit()

    # Look up role names and send email
    role_names_query = await db.execute(text("SELECT name FROM roles WHERE id = ANY(:rids)"), {"rids": role_ids})
    role_names = [r[0] for r in role_names_query.all()]
    role_name_str = ", ".join(role_names) if role_names else "Team Member"

    accept_url = f"{settings.CRM_FRONTEND_URL}/accept-invite?token={token}"
    email_sent = False
    try:
        email_res = await send_team_invitation_email(
            to_email=email,
            inviter_name=getattr(user, "name", None) or "A team member",
            role_name=role_name_str,
            accept_url=accept_url,
            expires_at=expires.strftime("%B %d, %Y")
        )
        email_sent = email_res.get("success", False)
    except Exception:
        logger.exception("Failed to send invitation email")

    await record_audit_log(db, "user.invite", "invitation", inv["id"], user.id, user.email, user.role, {"email": email, "role_ids": role_ids}, request)
    return {
        "email_sent": email_sent,
        "invitation": {
            "id": inv["id"],
            "email": inv["email"],
            "status": inv["status"],
            "expires_at": inv["expires_at"].isoformat() if hasattr(inv["expires_at"], "isoformat") else str(inv["expires_at"])
        }
    }


@router.post("/invitations", dependencies=[Depends(require_permission("users.invite"))])
async def create_invitation(request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    role_ids = body.get("roleIds") or []
    # If a single role_id was provided
    if "roleId" in body and body["roleId"]:
        role_ids = [int(body["roleId"])]
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    result = await _issue_invitation(db, request, user, email, role_ids)
    return {"ok": True, **result}

@router.delete("/invitations/{invitation_id}", dependencies=[Depends(require_permission("users.invite"))])
async def revoke_invitation(invitation_id: int, request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    inv = (await db.execute(text("SELECT id, email FROM invitations WHERE id = :id"), {"id": invitation_id})).mappings().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    await db.execute(text("DELETE FROM invitations WHERE id = :id"), {"id": invitation_id})
    await db.commit()
    await record_audit_log(db, "invitation.revoke", "invitation", invitation_id, user.id, user.email, user.role, {"email": inv["email"]}, request)
    return {"ok": True}

@router.post("/invitations/{invitation_id}/resend", dependencies=[Depends(require_permission("users.invite"))])
async def resend_invitation(invitation_id: int, request: Request, db: AsyncSession = Depends(get_db), user = Depends(require_auth)):
    inv = (await db.execute(text("SELECT id, email, token, invited_role_ids FROM invitations WHERE id = :id"), {"id": invitation_id})).mappings().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found")
    new_expires = datetime.now() + timedelta(days=7)
    await db.execute(text("UPDATE invitations SET expires_at = :exp, status = 'pending' WHERE id = :id"), {
        "exp": new_expires, "id": invitation_id
    })
    await db.commit()

    role_names_query = await db.execute(text("SELECT name FROM roles WHERE id = ANY(:rids)"), {"rids": inv["invited_role_ids"]})
    role_names = [r[0] for r in role_names_query.all()]
    role_name_str = ", ".join(role_names) if role_names else "Team Member"
    
    accept_url = f"{settings.CRM_FRONTEND_URL}/accept-invite?token={inv['token']}"
    email_sent = False
    try:
        email_res = await send_team_invitation_email(
            to_email=inv["email"],
            inviter_name=getattr(user, "name", None) or "A team member",
            role_name=role_name_str,
            accept_url=accept_url,
            expires_at=new_expires.strftime("%B %d, %Y")
        )
        email_sent = email_res.get("success", False)
    except Exception:
        pass

    await record_audit_log(db, "invitation.resend", "invitation", invitation_id, user.id, user.email, user.role, {"email": inv["email"]}, request)
    return {
        "ok": True,
        "email_sent": email_sent,
        "expires_at": new_expires.isoformat()
    }

