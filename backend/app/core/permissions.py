from typing import Dict, List, Optional, Any, Set, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

PERMISSION_ALIASES: Dict[str, str] = {
    "finances.view_invoices": "finances.view", "finances.view_profit_ledger": "finances.view",
    "finances.create_invoices": "finances.edit", "finances.record_payment": "finances.edit",
    "jobs.view_jobs": "jobs.view", "jobs.change_stage": "jobs.edit",
    "jobs.manage_permits": "jobs.edit", "jobs.delete": "jobs.edit",
    "clients.view_clients": "clients.view", "users.manage": "users.assign_roles",
    "users.edit": "users.assign_roles", "roles.manage": "roles.edit",
    "tasks.view": "calendar.view", "tasks.create": "calendar.create_event",
    "tasks.edit": "calendar.create_event", "tasks.delete": "calendar.create_event",
}

def normalize_permission_key(key: str) -> str:
    norm = key.replace(":", ".")
    return PERMISSION_ALIASES.get(norm, PERMISSION_ALIASES.get(key, norm))


# ── Company signature access ────────────────────────────────────────────────
# Single company contractor signature (Edith Guerrero). Levels are hierarchical:
# edit ⊃ use ⊃ view ⊃ none.
SIGNATURE_LEVELS: Tuple[str, ...] = ("none", "view", "use", "edit")
_SIGNATURE_RANK: Dict[str, int] = {lvl: i for i, lvl in enumerate(SIGNATURE_LEVELS)}


def normalize_signature_level(level: Any) -> str:
    val = str(level or "none").strip().lower()
    return val if val in _SIGNATURE_RANK else "none"


def signature_rank(level: Any) -> int:
    return _SIGNATURE_RANK[normalize_signature_level(level)]


def max_signature_level(levels) -> str:
    best = "none"
    for lvl in levels or []:
        if signature_rank(lvl) > signature_rank(best):
            best = normalize_signature_level(lvl)
    return best


class AuthUser:
    def __init__(
        self,
        id: int,
        name: str,
        email: str,
        role: str,
        status: str = "active",
        phone: Optional[str] = None,
        avatar_url: Optional[str] = None,
        permissions: Optional[Dict[str, str]] = None,
        is_protected_owner: bool = False,
        signature_access: str = "none",
        is_api_key: bool = False,
        api_key_id: Optional[int] = None,
        kind: Optional[str] = None,
    ):
        self.id, self.name, self.email = id, name, email
        self.role, self.status, self.phone = role, status, phone
        self.avatar_url, self.permissions = avatar_url, permissions or {}
        self.is_protected_owner, self.is_api_key = is_protected_owner, is_api_key
        # Owners always hold full (edit) access to the company signature; API keys never do.
        if is_api_key:
            self.signature_access = "none"
        elif role == "owner" or is_protected_owner:
            self.signature_access = "edit"
        else:
            self.signature_access = normalize_signature_level(signature_access)
        self.api_key_id = api_key_id
        self.kind = "api_key" if is_api_key else (kind or "user")
        self.user_id = None if self.kind == "api_key" else id

    def __getitem__(self, item: str) -> Any:
        return getattr(self, item)

    def get(self, item: str, default: Any = None) -> Any:
        return getattr(self, item, default)

    def __contains__(self, item: str) -> bool:
        return hasattr(self, item)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id, "name": self.name, "email": self.email, "role": self.role,
            "status": self.status, "phone": self.phone, "avatar_url": self.avatar_url,
            "permissions": self.permissions, "is_protected_owner": self.is_protected_owner,
            "signature_access": self.signature_access,
            "is_api_key": self.is_api_key, "api_key_id": self.api_key_id,
            "kind": self.kind, "user_id": self.user_id,
        }


def has_signature_access(user: Any, level: str) -> bool:
    """True when ``user`` holds at least ``level`` access to the company signature."""
    if not user:
        return False
    status = getattr(user, "status", None) if not isinstance(user, dict) else user.get("status")
    if status and status != "active":
        return False
    getter = user.get if isinstance(user, dict) else (lambda k, d=None: getattr(user, k, d))
    if getter("is_api_key", False):
        return False
    if getter("role") == "owner" or getter("is_protected_owner", False):
        return True
    return signature_rank(getter("signature_access", "none")) >= signature_rank(level)


async def resolve_signature_access(
    db: Any, user_id: int, role: Optional[str] = None, is_protected_owner: bool = False
) -> str:
    """Effective company-signature access = highest level across all of the user's roles."""
    if role == "owner" or is_protected_owner:
        return "edit"
    rows = (await db.execute(
        text("""
            SELECT r.signature_access
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = :uid
        """),
        {"uid": user_id},
    )).scalars().all()
    return max_signature_level(rows)


def has_permission(
    user: Optional[AuthUser],
    permission: str,
    required_scope: Optional[str] = None
) -> bool:
    if not user or user.status != "active":
        return False

    norm_key = normalize_permission_key(permission)

    # Protected Owner check
    if user.role == "owner" or user.is_protected_owner:
        return True

    perms = getattr(user, "permissions", {}) or {}
    if isinstance(perms, dict):
        user_scope = perms.get("*") or perms.get(norm_key) or perms.get(permission)
    elif isinstance(perms, (list, tuple, set)):
        user_scope = "all" if ("*" in perms or norm_key in perms or permission in perms) else None
    else:
        user_scope = None

    if not user_scope:
        return False

    if not required_scope:
        return True

    if required_scope == "all":
        return user_scope == "all"
    if required_scope == "assigned":
        return user_scope in ("assigned", "all")
    if required_scope == "own":
        return user_scope in ("own", "assigned", "all")

    return True

def has_any_permission(user: Optional[AuthUser], permissions: List[str]) -> bool:
    return any(has_permission(user, p) for p in permissions)

def get_permission_scope(user: Optional[AuthUser], permission: str) -> Optional[str]:
    if not user or user.status != "active":
        return None

    if user.role == "owner" or getattr(user, "is_protected_owner", False):
        return "all"

    norm_key = normalize_permission_key(permission)
    perms = getattr(user, "permissions", {}) or {}
    if isinstance(perms, dict):
        if perms.get("*"):
            return "all"
        return perms.get(norm_key) or perms.get(permission)
    elif isinstance(perms, (list, tuple, set)):
        if "*" in perms or norm_key in perms or permission in perms:
            return "all"
        return None

    return None

class ScopeFilterResult(dict):
    """Dict that also supports tuple unpacking: allowed, clause, params = build_scope_filter(...)"""
    def __iter__(self):
        yield self.get("allowed", False)
        yield self.get("clause", "1=0")
        params = self.get("params")
        if isinstance(params, dict):
            yield list(params.values())
        else:
            yield params or []

def build_scope_filter(
    user: Any,
    permission: Optional[str] = None,
    action: Optional[str] = None,
    creator_col: str = "created_by",
    assigned_col: str = "assigned_to_user_id",
    param_offset: int = 1,
    param_prefix: Optional[str] = None
) -> ScopeFilterResult:
    """
    Returns ScopeFilterResult with keys 'allowed', 'clause', 'params'.
    Compatible with both dictionary access (scope['allowed']) and tuple unpacking.
    """
    perm = permission or action or ""
    
    # Handle user whether AuthUser object or dict
    u_obj = user
    if isinstance(user, dict):
        u_obj = AuthUser(
            id=user.get("id", 0),
            name=user.get("name", ""),
            email=user.get("email", ""),
            role=user.get("role", ""),
            status=user.get("status", "active"),
            permissions=user.get("permissions", {}),
            is_protected_owner=user.get("is_protected_owner", user.get("role") == "owner"),
        )

    scope = get_permission_scope(u_obj, perm) if u_obj else None
    if not u_obj or not scope:
        return ScopeFilterResult({"allowed": False, "clause": "1=0", "params": {}})

    if scope == "all":
        return ScopeFilterResult({"allowed": True, "clause": "1=1", "params": {}})

    uid = getattr(u_obj, "id", None) or (user.get("id") if isinstance(user, dict) else None)

    if param_prefix is not None:
        p_name = f"{param_prefix}uid"
        if scope == "assigned":
            clause = f"({assigned_col} = :{p_name} OR {creator_col} = :{p_name})"
            return ScopeFilterResult({"allowed": True, "clause": clause, "params": {p_name: uid}})
        if scope == "own":
            clause = f"{creator_col} = :{p_name}"
            return ScopeFilterResult({"allowed": True, "clause": clause, "params": {p_name: uid}})
    else:
        if scope == "assigned":
            clause = f"({assigned_col} = ${param_offset} OR {creator_col} = ${param_offset})"
            return ScopeFilterResult({"allowed": True, "clause": clause, "params": [uid]})
        if scope == "own":
            clause = f"{creator_col} = ${param_offset}"
            return ScopeFilterResult({"allowed": True, "clause": clause, "params": [uid]})

    return ScopeFilterResult({"allowed": False, "clause": "1=0", "params": {}})

def check_resource_access(
    user: Any,
    permission: str,
    creator_id: Optional[int] = None,
    assigned_id: Optional[int] = None
) -> bool:
    """
    Validates whether the current user has access to a specific record based on
    their resolved permission scope ('all', 'assigned', 'own', 'none').
    """
    if not user:
        return False

    u_obj = user
    if isinstance(user, dict):
        u_obj = AuthUser(
            id=user.get("id", 0),
            name=user.get("name", ""),
            email=user.get("email", ""),
            role=user.get("role", ""),
            status=user.get("status", "active"),
            permissions=user.get("permissions", {}),
            is_protected_owner=user.get("is_protected_owner", user.get("role") == "owner"),
        )

    if u_obj.role == "owner" or getattr(u_obj, "is_protected_owner", False):
        return True

    scope = get_permission_scope(u_obj, permission)
    if not scope or scope == "none":
        return False

    if scope == "all":
        return True

    # API keys are evaluated strictly by scope ('all') and never possess human ownership
    if getattr(u_obj, "is_api_key", False) or getattr(u_obj, "kind", "user") == "api_key":
        return False

    uid = getattr(u_obj, "id", None)
    if uid is None or uid == 0 or uid == "0":
        return False


    str_uid = str(uid)
    str_creator = str(creator_id) if creator_id is not None else None
    str_assigned = str(assigned_id) if assigned_id is not None else None

    if scope == "assigned":
        return (str_assigned is not None and str_assigned == str_uid) or (str_creator is not None and str_creator == str_uid)

    if scope == "own":
        return str_creator is not None and str_creator == str_uid

    return False

async def get_user_effective_permissions(db: AsyncSession, user_id: int) -> Tuple[Dict[str, str], bool]:
    """
    Resolves effective permissions union across all roles assigned to user.
    """
    sql = text("""
        SELECT 
            r.name as role_name,
            r.is_protected,
            p.key as permission_key,
            rp.scope
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = :user_id
    """)

    result = await db.execute(sql, {"user_id": user_id})
    rows = result.mappings().all()

    is_protected_owner = False
    permissions: Dict[str, str] = {}

    for r in rows:
        if r.get("role_name") == "Owner":
            is_protected_owner = True

        p_key = r.get("permission_key")
        scope = r.get("scope")
        if p_key and scope:
            existing = permissions.get(p_key)
            if not existing:
                permissions[p_key] = scope
            elif existing != "all":
                if scope == "all":
                    permissions[p_key] = "all"
                elif (existing == "own" and scope == "assigned") or (existing == "assigned" and scope == "own"):
                    permissions[p_key] = "assigned"

    if is_protected_owner:
        permissions["*"] = "all"

    return permissions, is_protected_owner

def require_permission(permission: str, required_scope: Optional[str] = None):
    from app.middlewares.auth import require_permission as _req_perm
    return _req_perm(permission, required_scope)

def require_any_permission(permissions: List[str]):
    from app.middlewares.auth import require_any_permission as _req_any
    return _req_any(permissions)

def require_auth_user():
    from app.middlewares.auth import require_auth
    return require_auth

SYSTEM_PERMISSIONS = [
    # Leads
    ("leads.view", "leads", "view", "View CRM leads"),
    ("leads.create", "leads", "create", "Create new leads"),
    ("leads.edit", "leads", "edit", "Edit lead details"),
    ("leads.delete", "leads", "delete", "Delete leads"),
    ("leads.claim", "leads", "claim", "Claim unassigned leads"),
    ("leads.reassign", "leads", "reassign", "Reassign leads to other team members"),
    # Clients
    ("clients.view", "clients", "view", "View CRM clients"),
    ("clients.create", "clients", "create", "Create new clients"),
    ("clients.edit", "clients", "edit", "Edit client details"),
    ("clients.delete", "clients", "delete", "Delete clients"),
    # Pipeline
    ("pipeline.view", "pipeline", "view", "View sales pipeline Kanban and analytics"),
    ("pipeline.advance_stage", "pipeline", "advance_stage", "Move deals between pipeline stages"),
    ("pipeline.override_gate", "pipeline", "override_gate", "Override automated stage transition gates"),
    # Estimates
    ("estimates.view", "estimates", "view", "View roofing estimates"),
    ("estimates.create", "estimates", "create", "Create estimates"),
    ("estimates.send", "estimates", "send", "Send estimates to clients"),
    ("estimates.edit_pricing_templates", "estimates", "edit_pricing_templates", "Modify pricing calculators and cost catalogs"),
    # Contracts
    ("contracts.view", "contracts", "view", "View contracts"),
    ("contracts.edit", "contracts", "edit", "Edit contract drafts and see signing links"),
    ("contracts.void", "contracts", "void", "Void or cancel contracts"),
    # Jobs
    ("jobs.view", "jobs", "view", "View jobs and dispatching"),
    ("jobs.edit", "jobs", "edit", "Edit job schedules and assignments"),
    ("jobs.mark_complete", "jobs", "mark_complete", "Mark jobs completed"),
    # Calendar
    ("calendar.view", "calendar", "view", "View schedule and calendar"),
    ("calendar.create_event", "calendar", "create_event", "Schedule site visits and meetings"),
    ("calendar.view_others", "calendar", "view_others", "View other team members' calendars"),
    # Tasks & Follow-ups
    ("tasks.view", "tasks", "view", "View team and personal tasks"),
    ("tasks.create", "tasks", "create", "Create tasks and follow-ups"),
    ("tasks.edit", "tasks", "edit", "Edit and complete tasks"),
    ("tasks.delete", "tasks", "delete", "Delete tasks"),
    # Inspections
    ("inspections.view", "inspections", "view", "View roof inspections"),
    ("inspections.create", "inspections", "create", "Create and log roof inspections"),
    ("inspections.edit_checklist_templates", "inspections", "edit_checklist_templates", "Edit inspection checklists"),
    # Finances
    ("finances.view", "finances", "view", "View company finances, job margins, and revenue"),
    ("finances.edit", "finances", "edit", "Record payments and edit invoices"),
    # Reports & Warranties
    ("reports.view", "reports", "view", "View executive reporting and KPI trends"),
    ("warranties.view", "warranties", "view", "View warranty certificates"),
    ("warranties.create", "warranties", "create", "Issue warranties"),
    ("warranties.edit", "warranties", "edit", "Edit warranty terms"),
    # Estimator Settings
    ("estimator_settings.view", "estimator_settings", "view", "View estimator configuration"),
    ("estimator_settings.edit", "estimator_settings", "edit", "Update cost baselines and square footage formulas"),
    # Roles & Users
    ("roles.view", "roles", "view", "View system roles and matrix"),
    ("roles.create", "roles", "create", "Create new custom roles"),
    ("roles.edit", "roles", "edit", "Modify role permissions and scopes"),
    ("roles.delete", "roles", "delete", "Delete custom roles"),
    ("roles.assign_permissions", "roles", "assign_permissions", "Assign granular permissions to roles"),
    ("users.view", "users", "view", "View team members"),
    ("users.invite", "users", "invite", "Invite new team members"),
    ("users.deactivate", "users", "deactivate", "Deactivate users"),
    ("users.assign_roles", "users", "assign_roles", "Assign roles to users"),
    # Content & Settings Management
    ("settings.edit", "settings", "edit", "Edit CRM appearance settings (banners, quotes, templates)"),
    # Audit
    ("activity.view", "activity", "view", "View the employee activity audit log (who changed what, and when)"),
]

async def seed_system_rbac(conn):
    """
    Idempotently seeds all system permissions and ensures the default Owner role exists.
    """
    for key, resource, action, description in SYSTEM_PERMISSIONS:
        inserted_id = (await conn.execute(
            text("""
                INSERT INTO permissions (key, resource, action, description)
                VALUES (:k, :r, :a, :d)
                ON CONFLICT (key) DO NOTHING
                RETURNING id
            """),
            {"k": key, "r": resource, "a": action, "d": description}
        )).scalar_one_or_none()

        if key == "contracts.edit" and inserted_id is not None:
            # First creation only: preserve existing behaviour for roles that could already
            # work with contracts. Admins can revoke it afterwards in the Role Studio.
            await conn.execute(
                text("""
                    INSERT INTO role_permissions (role_id, permission_id, scope)
                    SELECT rp.role_id, :new_id, 'all'
                    FROM role_permissions rp
                    JOIN permissions p ON p.id = rp.permission_id
                    WHERE p.key = 'contracts.view'
                    ON CONFLICT (role_id, permission_id) DO NOTHING
                """),
                {"new_id": inserted_id},
            )

    # Ensure Owner role exists (always holds full edit access to the company signature)
    await conn.execute(text("""
        INSERT INTO roles (name, description, is_protected, signature_access, created_at, updated_at)
        VALUES ('Owner', 'Executive owner with unrestricted access across all systems', true, 'edit', NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET is_protected = true, signature_access = 'edit'
    """))

    # Ensure Administrator role exists. New installs default to 'edit' signature access;
    # an existing Administrator keeps whatever level the Owner configured.
    await conn.execute(text("""
        INSERT INTO roles (name, description, is_protected, signature_access, created_at, updated_at)
        VALUES ('Administrator', 'System administrator with elevated operational privileges', true, 'edit', NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET is_protected = true
    """))

    # Populate role_permissions for Administrator (preserving any custom scopes set by Owner)
    admin_role_id = (await conn.execute(text("SELECT id FROM roles WHERE name = 'Administrator'"))).scalar()
    if admin_role_id:
        await conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id, scope)
            SELECT :rid, p.id, 'all'
            FROM permissions p
            ON CONFLICT (role_id, permission_id) DO NOTHING
        """), {"rid": admin_role_id})

    # Associate Owner role with owner user
    owner_user = (await conn.execute(text("SELECT id FROM users WHERE role = 'owner' ORDER BY id ASC LIMIT 1"))).mappings().first()
    owner_role = (await conn.execute(text("SELECT id FROM roles WHERE name = 'Owner' LIMIT 1"))).mappings().first()
    if owner_user and owner_role:
        await conn.execute(
            text("""
                INSERT INTO user_roles (user_id, role_id, assigned_at)
                VALUES (:uid, :rid, NOW())
                ON CONFLICT (user_id, role_id) DO NOTHING
            """),
            {"uid": owner_user["id"], "rid": owner_role["id"]}
        )
