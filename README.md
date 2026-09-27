# Rise Up CRM

Internal CRM and operational platform for Rise Up Roofing & Construction — built for managing leads, pipeline, estimates, contracts, client relationships, and team operations.

---

## Project Structure

```
riseup-crm/
├── backend/        # FastAPI REST API (Python 3.12+)
│   ├── app/        # Application source (routers, models, services, core)
│   ├── alembic/    # Database migrations
│   └── Dockerfile  # Production container
└── crm/            # React CRM frontend (Vite + TypeScript + Tailwind)
    ├── src/        # Application source
    └── public/     # Static assets
```

---

## Tech Stack

**Backend**
- Python 3.12, FastAPI, SQLAlchemy (async), Alembic
- PostgreSQL 16, Redis 7
- Docker / Docker Compose (production)

**CRM Frontend**
- React 19, TypeScript, Vite 6
- Tailwind CSS v4, TanStack Query
- React Router v7

---

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main`  | Production-ready code. Merged from `dev` when stable. |
| `dev`   | Active development. All feature branches merge here first. |

---

## Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in values.

**CRM** — copy `crm/.env.example` to `crm/.env`. In local dev, the Vite proxy handles API routing — no `VITE_BACKEND_URL` needed. For production, `crm/.env.production` sets `VITE_BACKEND_URL`.

---

## Deployment

Production runs on a VPS behind nginx with:
- `backend.riseuprac.com` → FastAPI container (port 8010)
- `crm.riseuprac.com` → Static files served by nginx (with `/api/` proxied to backend)

Backend code is baked into the Docker image at build time. Deploys require `docker compose build backend && docker compose up -d --force-recreate backend`.
