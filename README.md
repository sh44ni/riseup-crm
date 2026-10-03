<div align="center">

# Rise Up Roofing & Construction — Enterprise Monorepo

**Production-Grade Platform: High-Performance Backend API, Modern React CRM, and Public Marketing Site**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage-2496ED?logo=docker)](https://www.docker.com)

</div>

---

## 1. System Overview

Rise Up Roofing & Construction operates a unified, hardened digital infrastructure designed to power roofing and construction operations across San Diego County.

```mermaid
graph TD
    Client["Client Browsers / Devices"] -->|HTTPS| Cloudflare["Cloudflare / Reverse Proxy"]
    
    subgraph Frontend Applications
        Web["Next.js 16 Website<br/>(Public Lead Gen, Estimator)"]
        CRM["React 19 CRM<br/>(Kanban, Contracts, RBAC)"]
    end

    subgraph Core Platform
        API["FastAPI Backend<br/>(Domain Driven, Cookie Auth, CSRF)"]
        Worker["ARQ Background Worker<br/>(Playwright Chromium PDF Gen, Reviews)"]
    end

    subgraph Data & Storage
        PG[("PostgreSQL 16<br/>(ACID Transactions, Row Auditing)")]
        Redis[("Redis 7<br/>(Session Cache, Rate Limit, ARQ Queue)")]
        S3[("MinIO / S3<br/>(Contracts, Photos, Media)")]
    end

    Cloudflare --> Web
    Cloudflare --> CRM
    Web -->|API Key| API
    CRM -->|HttpOnly Cookie + CSRF| API
    API --> PG
    API --> Redis
    API --> S3
    Worker --> PG
    Worker --> Redis
    Worker --> S3
```

---

## 2. Repository Layout

```
riseup-roofing/
├── backend/                  # FastAPI Application, Domain Models & Migrations
│   ├── alembic/              # Database schema migrations
│   ├── app/
│   │   ├── api/              # Routers (admin, public, developer)
│   │   ├── core/             # Security, CSRF, permissions, database, config
│   │   ├── domain/           # DDD Domain entities, aggregates & rules
│   │   ├── middlewares/      # Auth, security headers, rate limiting, telemetry
│   │   └── tasks/            # ARQ background worker and cron jobs
│   ├── Dockerfile            # Hardened multi-stage non-root runtime image
│   ├── Dockerfile.worker     # Isolated Chromium worker image
│   ├── docker-compose.yml    # Development stack
│   ├── docker-compose.prod.yml # Hardened production stack
│   └── tests/                # 350+ Pytest tests, perf load tests, authz matrix
│
├── crm/                      # Staff Backoffice Single Page Application
│   ├── src/
│   │   ├── components/       # UI components (Pipeline, Contracts, Leads, Clients)
│   │   ├── context/          # AuthContext (cookie hydration), CompanyContext
│   │   ├── features/         # Domain-sliced business workflows
│   │   ├── shared/           # API clients, design tokens, UI primitives
│   │   └── lib/              # Client state, structured logger, chunk reload
│   ├── vercel.json           # Restrictive CSP and defensive HTTP headers
│   └── package.json          # Vite, Vitest, Tailwind CSS v4, TypeScript
│
├── website/                  # Public Next.js Marketing Portal & Estimator
│
├── docs/                     # Architectural Documentation & Operational Runbooks
│   ├── architecture/         # System diagrams, auth specs, backend & frontend rules
│   ├── decisions/            # Architecture Decision Records (ADRs)
│   └── ops/                  # Runbooks: deploy, rollback, secret rotation, backups
│
├── plans/                    # 10/10 Architecture & Security Engineering Roadmaps
└── scripts/                  # Quality ratchet, backup restore verification
```

---

## 3. Quick Start (Development)

### Prerequisites
- Docker & Docker Compose
- Node.js >= 20, npm >= 10
- Python 3.12+ (uv or venv)

### 1. Boot Core Infrastructure & API
```bash
# Start PostgreSQL, Redis, MinIO, FastAPI, and ARQ Worker
cd backend
docker compose up -d

# Check service health
curl -f http://localhost:8000/health
```

### 2. Boot CRM Backoffice
```bash
cd crm
npm install
npm run dev
# CRM running on http://localhost:5173 (proxies /api to http://localhost:8000)
```

### 3. Seed Development Database
```bash
cd backend
.\.venv\Scripts\python.exe scripts/seed_dev.py
# Default owner credentials: owner@riseuprac.com / TestPassword123!
```

---

## 4. Test Suites & Verification Gates

### Run All Backend Tests (Pytest)
```bash
cd backend
pytest tests/ -v
# Validates 350+ tests including auth matrix, CSRF, and domain workflows
```

### Run Performance Budget Tests
```bash
cd backend
pytest tests/perf/ -v
# Asserts p95 latencies < 300ms (lists/board) and SQL statement ceilings
```

### Run Frontend Vitest Suite
```bash
cd crm
npm test -- --run
```

### Run TypeScript Compilation Check
```bash
cd crm
npx tsc -b
```

### Enforce Quality Ratchet
```bash
python scripts/quality_ratchet.py
# Fails CI if any metric (untyped any, files over limit, raw fetch) regressed
```

---

## 5. Security & Authentication Architecture

1. **HttpOnly Cookie Sessions:**
   - Client never accesses session secrets via JavaScript.
   - Issued with `HttpOnly; SameSite=Lax; Path=/; Secure`.
2. **Double-Submit Signed CSRF:**
   - Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require an `X-CSRF-Token` header.
   - Derived deterministically via HMAC-SHA256(`SESSION_SECRET_KEY`, `session_token`).
3. **Strict Principal Separation:**
   - Service API keys have `kind: "api_key"` and `user_id = None`.
   - Human users have `kind: "user"` with integer `user_id`.
   - API keys cannot claim record ownership, preventing IDOR vulnerabilities.
4. **Defensive Headers & Restrictive CSP:**
   - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
   - Restrictive Content-Security-Policy on both API and CRM hosting.

---

## 6. Operational Documentation
- [Architecture Overview](docs/architecture/overview.md)
- [Auth & Contract Architecture](docs/architecture/auth.md)
- [Environment Variables](docs/ops/environment.md)
- [Deploy & Rollback Runbook](docs/ops/deploy_rollback.md)
- [Secret Rotation Runbook](docs/ops/secret_rotation.md)
- [Security Policy & Reporting](SECURITY.md)

---

## 7. License
Private & Proprietary — All rights reserved © 2026 Rise Up Roofing & Construction Inc.
