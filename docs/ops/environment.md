# Rise Up Roofing & CRM — Environment Configuration Reference

This document defines all operational environment variables across the backend API, workers, and frontend applications.

## 1. Environment Classification
The runtime environment is controlled via `ENVIRONMENT` (or `APP_ENV`).
- `development`, `dev`, `local`, `test`, `testing`: Development mode. Permits local defaults, relaxes production secret checks.
- `staging`, `production`, `prod`: Production mode. **Enforces startup secret validation**; refuses to boot if any secret is unset, under 32 characters, or matches known historical default hashes.

---

## 2. Backend Environment Variables

| Variable | Type | Default | Required in Prod? | Description & Security Policy |
| :--- | :--- | :--- | :---: | :--- |
| `ENVIRONMENT` | string | `development` | Yes | Target runtime mode (`production` / `staging` / `development`). |
| `APP_ENV` | string | `development` | No | Alias for `ENVIRONMENT`. Resolves to `production` if either specifies it. |
| `APP_NAME` | string | `Rise Up Roofing API...` | No | Operational application name displayed in health endpoints and logs. |
| `PORT` | integer | `8000` | No | Internal port the Uvicorn ASGI server binds to. |
| `HOST` | string | `0.0.0.0` | No | Interface address to bind. |
| `WEB_CONCURRENCY` | integer | `2` | Recommended | Number of Uvicorn worker processes in container (`4` recommended for prod). |
| `DEBUG` | boolean | `false` | No | Debug mode. **Must be false in production**. |
| `DATABASE_URL` | string | - | **YES** | Async PostgreSQL connection URI: `postgresql+asyncpg://user:pass@host:5432/dbname`. |
| `DB_POOL_SIZE` | integer | `5` | No | Number of persistent database connections maintained in the pool. |
| `DB_MAX_OVERFLOW` | integer | `5` | No | Maximum burst connections above `DB_POOL_SIZE`. |
| `DB_POOL_TIMEOUT` | integer | `30` | No | Seconds to wait before raising a connection timeout error. |
| `DB_POOL_PRE_PING` | boolean | `true` | No | Actively ping connections before checkout to prevent stale disconnects. |
| `REDIS_URL` | string | `redis://localhost:6379/0`| **YES** | Redis DSN for session cache, rate-limiting, and ARQ queue. |
| `SESSION_SECRET_KEY`| string | `""` | **YES** | Minimum 32-char high-entropy secret. Used to derive HMAC-SHA256 CSRF tokens. |
| `COOKIE_NAME` | string | `admin_session` | No | Session cookie name (`admin_session` in dev, `__Host-session` in prod). |
| `SESSION_HOURS` | integer | `24` | No | Active session lifetime in hours. |
| `MIGRATION_KEY` | string | `""` | **YES** | Minimum 32-char secret required for administrative data migrations. |
| `CRON_SECRET` | string | `""` | **YES** | Minimum 32-char secret required in `X-Cron-Secret` header for webhook sweepers. |
| `LEGACY_BEARER_AUTH`| boolean | `true` | Dual-mode | Rollout lever. Set `false` once all active browser sessions use cookies. |
| `CSRF_COOKIE_NAME` | string | `csrf_token` | No | Double-submit CSRF cookie name. |
| `CSRF_HEADER_NAME` | string | `x-csrf-token` | No | Header name checked on mutating requests. |
| `CORS_ORIGINS` | comma-sep list | localhost, riseuprac.com | **YES** | Explicit list of trusted origins allowed for credentialed CORS. |
| `PUBLIC_BACKEND_URL`| string | `""` | **YES** | Canonical public origin of backend API (e.g. `https://api.riseuprac.com`). |
| `CRM_FRONTEND_URL` | string | `https://crm.riseuprac.com`| **YES** | Public canonical origin of the CRM frontend application. |

### Storage & Integrations
| Variable | Type | Default | Required in Prod? | Description & Security Policy |
| :--- | :--- | :--- | :---: | :--- |
| `S3_ENDPOINT_URL` | string | `http://localhost:9000` | Cloud | S3 / Cloudflare R2 / AWS endpoint URL. |
| `S3_ACCESS_KEY` | string | `minioadmin` | **YES** | S3 API Access Key ID. |
| `S3_SECRET_KEY` | string | `minioadmin` | **YES** | S3 API Secret Key. |
| `S3_BUCKET_MEDIA` | string | `riseup-media` | No | Bucket for customer photos, roof inspection images, and avatars. |
| `S3_BUCKET_DOCS` | string | `riseup-documents` | No | Bucket for signed contract PDFs and formal proposals. |
| `S3_REGION` | string | `us-east-1` | No | S3 region identifier. |
| `RESEND_API_KEY` | string | `""` | **YES** | API key for transactional emails (proposals, estimates, invites). |
| `RESEND_FROM_EMAIL`| string | `Rise Up Roofing <estimates@riseuprac.com>` | No | Default sender address. |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | string | `""` | **YES** | Turnstile server-side verification key for public estimate forms. |
| `GOOGLE_CLIENT_ID` | string | `""` | Optional | Google OAuth 2.0 Client ID for Calendar sync. |
| `GOOGLE_CLIENT_SECRET` | string | `""` | Optional | Google OAuth 2.0 Client Secret. |
| `YELP_API_KEY` | string | `""` | Optional | API key for syncing Yelp customer reviews. |
| `WEATHER_API_KEY` | string | `""` | Optional | OpenWeatherMap API key for project scheduling forecast. |

---

## 3. Frontend Environment Variables (`crm/`)

| Variable | Type | Default | Required in Prod? | Description |
| :--- | :--- | :--- | :---: | :--- |
| `VITE_API_URL` | string | `""` (proxied `/api`) | No | Custom backend base URL if running cross-origin (empty for same-origin). |
| `VITE_APP_ENV` | string | `production` | No | Application environment tag. |
| `VITE_SENTRY_DSN`| string | `""` | Recommended | Sentry DSN for frontend telemetry and unhandled error tracking. |

---

## 4. Startup Secret Validation Guarantee
The backend incorporates fail-fast validation in `backend/app/core/config.py`:
1. If `ENVIRONMENT` is non-development and any of `SESSION_SECRET_KEY`, `MIGRATION_KEY`, or `CRON_SECRET` are missing, shorter than 32 characters, or match known-bad historical digests, the process will immediately crash with `ValueError` and log a critical error before binding the port.
2. This prevents accidental deployments with missing or insecure credentials.
