# Architecture: Backend Engineering & Layering Specification

## 1. Architectural Philosophy
The Rise Up Roofing backend is engineered with clean, domain-driven boundaries (DDD) and strict separation of concerns.

```
┌────────────────────────────────────────────────────────┐
│                   Presentation Layer                   │
│   FastAPI Routers, Middlewares, Schemas, CSRF, Auth    │
└──────────────────────────┬─────────────────────────────┘
                           │ Calls
┌──────────────────────────▼─────────────────────────────┐
│                    Application / Domain                │
│   Aggregates, Domain Services, Events, Business Rules   │
└──────────────────────────┬─────────────────────────────┘
                           │ Reads/Writes
┌──────────────────────────▼─────────────────────────────┐
│                 Infrastructure / Data Access           │
│   Unit of Work, SQLAlchemy AsyncSession, Redis, S3     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Module Structure

```
backend/app/
├── api/                  # HTTP Routers & Route Handlers
│   ├── admin/            # Authenticated staff endpoints (leads, pipeline, contracts)
│   ├── public/           # Unauthenticated customer endpoints (forms, portal, cron)
│   └── developer/        # Telemetry, API key provisioning, documentation
├── core/                 # Cross-cutting platform concerns
│   ├── config.py         # Settings & environment validation
│   ├── csrf.py           # HMAC-SHA256 double-submit CSRF verification
│   ├── permissions.py    # RBAC permissions, AuthUser principal, scope filters
│   ├── errors.py         # Domain error taxonomy
│   ├── uow.py            # Unit of Work transaction manager
│   └── database.py       # Engine & AsyncSession factory
├── domain/               # Core business aggregates and services
│   ├── leads/            # Lead aggregate, status transitions, followups
│   ├── pipeline/         # Kanban stages, gate verification rules
│   ├── contracts/        # Contract drafting, signing state machine, legal text
│   └── estimates/        # Pricing engine, materials calculator
├── middlewares/          # ASGI middlewares
│   ├── auth.py           # Principal resolution, cookie sessions, CSRF gating
│   ├── security_headers.py # HSTS, nosniff, frame options, cache-control
│   ├── rate_limit.py     # Sliding window Redis rate limiter
│   └── telemetry.py      # Request tracing & performance metric buffer
└── tasks/                # ARQ background task workers
```

---

## 3. Standard Recipe: Adding an Endpoint End-to-End

To add a new feature or endpoint, follow this 5-step pattern:

### Step 1: Define Request & Response Schemas (`app/schemas/`)
```python
from pydantic import BaseModel, Field, ConfigDict

class CreateProjectRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    lead_id: int
    model_config = ConfigDict(extra="forbid")

class ProjectResponse(BaseModel):
    id: int
    title: str
    status: str
    model_config = ConfigDict(from_attributes=True, extra="allow")
```

### Step 2: Implement Domain Logic & Invariants (`app/domain/`)
```python
class ProjectAggregate:
    @staticmethod
    def create(lead_id: int, title: str, creator_id: int) -> dict:
        # Enforce business invariants
        if not title.strip():
            raise ValidationError("Title cannot be blank")
        return {
            "lead_id": lead_id,
            "title": title.strip(),
            "status": "draft",
            "created_by": creator_id
        }
```

### Step 3: Implement Database Interaction via Unit of Work (`app/core/uow.py`)
```python
async with UnitOfWork(db) as uow:
    project_data = ProjectAggregate.create(lead_id, payload.title, user.id)
    await uow.session.execute(
        text("INSERT INTO projects (title, lead_id, created_by) VALUES (:t, :lid, :uid)"),
        {"t": project_data["title"], "lid": project_data["lead_id"], "uid": user.id}
    )
    await uow.commit()
```

### Step 4: Expose Router Endpoint (`app/api/admin/`)
Always decorate with explicit `response_model`, permissions dependency, and rate limit:
```python
@router.post("/projects", response_model=ProjectResponse, dependencies=[Depends(require_permission("projects.create"))])
async def create_project(
    payload: CreateProjectRequest,
    user: AuthUser = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
):
    # Execute workflow and return typed response
    ...
```

### Step 5: Add Integration Test (`tests/`)
Assert:
- Unauthorized caller receives 401.
- Caller missing permission receives 403.
- Cookie-authenticated request requires valid `X-CSRF-Token`.
- Valid caller succeeds with 200/201 matching `response_model`.

---

## 4. Error Taxonomy & Exception Handling
All business exceptions inherit from `DomainError` in `backend/app/core/errors.py`:

| Exception | HTTP Status | Description |
| :--- | :---: | :--- |
| `EntityNotFound` | 404 | Record does not exist or user lacks read visibility. |
| `Conflict` | 409 | Duplicate resource (e.g. email or active session conflict). |
| `Forbidden` | 403 | Missing required RBAC scope or attempting IDOR ownership. |
| `ValidationFailed`| 422 | Business constraint violation (e.g. invalid status move). |
| `BadInput` | 400 | Malformed query parameter or incompatible argument. |

---

## 5. Background Jobs & Asynchronous Tasks (ARQ)
Long-running and non-blocking tasks are offloaded to Redis using ARQ:
- **PDF Generation:** Contract PDFs rendered via Playwright in the dedicated Chromium worker container.
- **Review Synchronization:** Scheduled daily at 03:00 UTC.
- **Image Optimization:** Resizes and strips EXIF from uploaded photos.
