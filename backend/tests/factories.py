"""
Model factories and authentication helpers for the backend test harness.
Provides deterministic builders for users, leads, clients, estimates, contracts, and jobs.
"""
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.security import hash_scrypt_password
from app.models.user import User
from app.models.client import Client, Lead
from app.models.estimate import Estimate
from app.models.pipeline import Contract
from app.models.job import Job
from app.models.api_key import ApiKey


async def make_user(
    db: AsyncSession,
    role: str = "owner",
    name: Optional[str] = None,
    email: Optional[str] = None,
    password: str = "TestPassword123!",
    status: str = "active",
    is_protected_owner: bool = False,
    permissions: Optional[List[str]] = None,
) -> User:
    """Create and persist a user in the test database."""
    uid = uuid.uuid4().hex[:8]
    if name is None:
        name = f"Test User {uid}"
    if email is None:
        email = f"user_{uid}@test.local"
    if permissions is None:
        if role == "owner":
            permissions = ["*"]
        elif role == "admin":
            permissions = ["leads.*", "estimates.*", "clients.*", "contracts.*", "jobs.*"]
        elif role == "sales_rep":
            permissions = [
                "leads.view:own",
                "leads.create:all",
                "leads.edit:own",
                "estimates.view:own",
                "estimates.create:all",
            ]
        elif role == "estimator":
            permissions = ["estimates.*:assigned", "leads.view:assigned"]
        elif role == "viewer":
            permissions = ["leads.view:all", "clients.view:all", "estimates.view:all"]
        else:
            permissions = []

    h, s = hash_scrypt_password(password)
    user = User(
        name=name,
        email=email.lower().strip(),
        phone="760-555-0100",
        password_hash=h,
        salt=s,
        role=role,
        status=status,
        permissions=permissions,
        is_active=(status == "active"),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Ensure role exists in roles table
    is_prot = (role == "owner") or is_protected_owner
    role_name_display = role.title() if role in ("owner", "admin") else role
    role_res = await db.execute(
        text("""
            INSERT INTO roles (name, description, is_protected, created_at, updated_at)
            VALUES (:rname, :desc, :is_prot, NOW(), NOW())
            ON CONFLICT (name) DO UPDATE SET is_protected = EXCLUDED.is_protected
            RETURNING id
        """),
        {"rname": role_name_display, "desc": f"{role} role", "is_prot": is_prot}
    )
    role_id = role_res.scalar_one()

    # Link user to role
    await db.execute(
        text("""
            INSERT INTO user_roles (user_id, role_id, assigned_at)
            VALUES (:uid, :rid, NOW())
            ON CONFLICT DO NOTHING
        """),
        {"uid": user.id, "rid": role_id}
    )

    # Map permissions to role_permissions
    for p_spec in permissions:
        if p_spec == "*":
            continue
        if ":" in p_spec:
            parts = p_spec.split(":")
            if len(parts) == 3:
                p_key = f"{parts[0]}.{parts[1]}"
                scope = parts[2]
            elif len(parts) == 2:
                if parts[1] in ("all", "own", "assigned", "none"):
                    p_key = parts[0]
                    scope = parts[1]
                else:
                    p_key = f"{parts[0]}.{parts[1]}"
                    scope = "all"
            else:
                p_key = parts[0]
                scope = "all"
        else:
            p_key = p_spec
            scope = "all"
        p_key = p_key.replace(":", ".")

        # Ensure permission exists
        res_p = await db.execute(
            text("""
                INSERT INTO permissions (key, resource, action, description)
                VALUES (:k, :res, :act, :desc)
                ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
                RETURNING id
            """),
            {
                "k": p_key,
                "res": p_key.split(".")[0],
                "act": p_key.split(".")[1] if "." in p_key else "manage",
                "desc": p_key
            }
        )
        pid = res_p.scalar_one()
        await db.execute(
            text("""
                INSERT INTO role_permissions (role_id, permission_id, scope)
                VALUES (:rid, :pid, :scope)
                ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
            """),
            {"rid": role_id, "pid": pid, "scope": scope}
        )

    await db.flush()
    return user


async def login_as(user: User, db: AsyncSession) -> Dict[str, str]:
    """
    Simulates logging in as `user` by generating a real 64-character session token
    and inserting it into the `admin_sessions` table.
    Returns HTTP headers dict with Authorization Bearer token.
    """
    token = secrets.token_hex(32)  # 64 chars
    expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    await db.execute(
        text("""
            INSERT INTO admin_sessions (token, user_id, expires_at, created_at)
            VALUES (:token, :uid, :exp, NOW())
            ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, expires_at = EXCLUDED.expires_at
        """),
        {"token": token, "uid": user.id, "exp": expires_at}
    )
    await db.flush()
    return {"Authorization": f"Bearer {token}"}


async def make_client(
    db: AsyncSession,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: str = "760-555-0199",
    address: str = "123 Main St",
    city: str = "Oceanside",
    zip_code: str = "92054",
    status: str = "lead",
    assigned_to_user_id: Optional[int] = None,
) -> Client:
    """Create and persist a Client."""
    uid = uuid.uuid4().hex[:8]
    if full_name is None:
        full_name = f"Client {uid}"
    if email is None:
        email = f"client_{uid}@test.local"

    client = Client(
        full_name=full_name,
        email=email.lower().strip(),
        phone=phone,
        address=address,
        city=city,
        zip=zip_code,
        status=status,
        client_category=status,
        assigned_to_user_id=assigned_to_user_id,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


async def make_lead(
    db: AsyncSession,
    client_id: Optional[int] = None,
    full_name: Optional[str] = None,
    contact_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: str = "760-555-0155",
    form_type: str = "contact",
    pipeline_stage: str = "stage_1_lead_gen",
    status: str = "new",
    assigned_to_user_id: Optional[int] = None,
    created_by_user_id: Optional[int] = None,
) -> Lead:
    """Create and persist a Lead."""
    uid = uuid.uuid4().hex[:8]
    actual_name = full_name or contact_name
    if actual_name is None:
        actual_name = f"Lead {uid}"
    if email is None:
        email = f"lead_{uid}@test.local"

    lead = Lead(
        client_id=client_id,
        form_type=form_type,
        full_name=actual_name,
        email=email.lower().strip(),
        phone=phone,
        address="456 Coastal Hwy",
        city="Carlsbad",
        zip="92008",
        service_type="residential tile",
        status=status,
        pipeline_stage=pipeline_stage,
        assigned_to_user_id=assigned_to_user_id,
        created_by_user_id=created_by_user_id,
        created_by=created_by_user_id,
    )
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return lead


async def make_estimate(
    db: AsyncSession,
    lead_id: Optional[int] = None,
    client_id: Optional[int] = None,
    created_by: Optional[int] = None,
    status: str = "draft",
    total: float = 18500.0,
    customer_name: str = "Test Estimate Customer",
    customer_email: str = "customer@test.local",
    proposal_data: Optional[Dict[str, Any]] = None,
) -> Estimate:
    """Create and persist an Estimate."""
    uid = uuid.uuid4().hex[:6]
    estimate_number = f"EST-2026-{uid}"

    if proposal_data is None:
        proposal_data = {
            "plans": [{
                "name": "Standard Shingle System",
                "price": total,
                "scopeItems": ["Tear off existing roof", "Install synthetic underlayment"],
            }]
        }

    estimate = Estimate(
        estimate_number=estimate_number,
        lead_id=lead_id,
        client_id=client_id,
        created_by=created_by,
        status=status,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_address="789 Valley Blvd, Escondido, CA 92025",
        service_type="residential tile",
        roof_squares=25.0,
        roof_pitch="4:12",
        stories=1,
        tearoff_layers=1,
        material_type="Tile",
        material_cost=7000.0,
        labor_cost=6000.0,
        subtotal=13000.0,
        margin_pct=30.0,
        total=total,
        proposal_data=proposal_data,
    )
    db.add(estimate)
    await db.flush()
    await db.refresh(estimate)
    return estimate


async def make_contract(
    db: AsyncSession,
    lead_id: Optional[int] = None,
    estimate_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status: str = "draft",
    signing_token: Optional[str] = None,
    client_name: str = "Test Contract Client",
    client_email: str = "contract_client@test.local",
    contract_data: Optional[Dict[str, Any]] = None,
    **kwargs: Any,
) -> Contract:
    """Create and persist a Contract."""
    uid = uuid.uuid4().hex[:6]
    contract_number = f"CON-2026-{uid}"
    if signing_token is None:
        signing_token = secrets.token_urlsafe(32)

    if contract_data is None:
        contract_data = {
            "client_name": client_name,
            "client_email": client_email,
            "project_address": "321 Palm Tree Lane, Vista, CA 92084",
            "scope_of_work": "Full tile underlayment replacement",
            "payment_schedule": [
                {"description": "Deposit", "amount": 1000},
                {"description": "Completion", "amount": 23000},
            ]
        }
    else:
        if "client_name" not in contract_data:
            contract_data["client_name"] = client_name
        if "client_email" not in contract_data:
            contract_data["client_email"] = client_email

    contract = Contract(
        contract_number=contract_number,
        signing_token=signing_token,
        lead_id=lead_id,
        estimate_id=estimate_id,
        client_id=client_id,
        status=status,
        contract_data=contract_data,
    )
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    return contract


async def make_job(
    db: AsyncSession,
    lead_id: Optional[int] = None,
    client_id: Optional[int] = None,
    estimate_id: Optional[int] = None,
    status: str = "scheduled",
    contract_value: float = 24000.0,
    customer_name: str = "Test Job Customer",
) -> Job:
    """Create and persist a Job."""
    uid = uuid.uuid4().hex[:6]
    job_number = f"JOB-2026-{uid}"

    job = Job(
        job_number=job_number,
        lead_id=lead_id,
        client_id=client_id,
        estimate_id=estimate_id,
        status=status,
        customer_name=customer_name,
        contract_value=contract_value,
        address="321 Palm Tree Lane",
        city="Vista",
        zip="92084",
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return job


async def make_api_key(
    db: AsyncSession,
    name: str = "Test Partner Integration",
    scopes: Optional[List[str]] = None,
    rate_limit_per_minute: int = 120,
    created_by_user_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Create and persist an ApiKey and return the plaintext key and record."""
    import hashlib
    if scopes is None:
        scopes = ["leads.create", "leads.view"]

    raw_key = f"rup_live_{secrets.token_hex(24)}"
    key_hash = hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()
    key_prefix = raw_key[:12]

    api_key_obj = ApiKey(
        name=name,
        key_hash=key_hash,
        key_prefix=key_prefix,
        environment="live",
        scopes=scopes,
        rate_limit_per_minute=rate_limit_per_minute,
        created_by_user_id=created_by_user_id,
        is_active=True,
    )
    db.add(api_key_obj)
    await db.flush()
    await db.refresh(api_key_obj)
    return {"raw_key": raw_key, "api_key": api_key_obj}
