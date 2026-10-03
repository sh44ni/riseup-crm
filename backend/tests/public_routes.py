"""
Allowlist of explicitly public (unauthenticated) routes.
Any route in the FastAPI application that does not have an authentication
dependency must be listed here with a documented reason string.
"""
from typing import Dict, Tuple

PUBLIC_ROUTES: Dict[Tuple[str, str], str] = {
    # System & Health Probes
    ("GET", "/"): "Root API status / info check",
    ("GET", "/health"): "Deployment liveness / health probe",
    ("GET", "/ready"): "Deployment readiness probe (DB, Redis, migrations)",
    ("GET", "/favicon.ico"): "Browser favicon",

    # Public Portals & Lifecycle Lookups (Tokens / Identifiers)
    ("GET", "/api/contract/{token}"): "Public contract viewing by signing token",
    ("POST", "/api/contract/{token}/sign"): "Public contract signing by customer token",
    ("GET", "/api/proposal/{identifier}"): "Public proposal viewing by identifier token",
    ("POST", "/api/proposal/{identifier}"): "Public proposal option selection by customer",
    ("GET", "/api/inspection/{identifier}"): "Public inspection report portal",
    ("GET", "/api/warranty/{identifier}"): "Public warranty certificate portal",
    ("GET", "/api/review/{token}"): "Public review verification by token",
    ("POST", "/api/review/{token}"): "Public review submission by token",
    ("GET", "/api/reviews/public"): "Public reviews feed for website widget",
    ("GET", "/api/public/invitations/{token}"): "Public team invite verification by token",
    ("POST", "/api/public/invitations/{token}/accept"): "Public team invite account setup",

    # Public Website Estimator & Financing
    ("GET", "/api/estimator/config"): "Public pricing calculator configuration for website",
    ("POST", "/api/estimator/calculate"): "Public instant quote calculation for website",
    ("GET", "/api/financing/config"): "Public financing APR and terms config for website",
    ("POST", "/api/financing/calculate"): "Public monthly financing payment calculator",

    # Cron / Scheduled Webhooks (secured via secret token in headers/params)
    ("GET", "/api/cron/sweep-pipeline-followups"): "Cron job for pipeline reminders (secured by X-Cron-Secret)",
    ("POST", "/api/cron/sweep-pipeline-followups"): "Cron job for pipeline reminders (secured by X-Cron-Secret)",
    ("GET", "/api/cron/sync-reviews"): "Cron job for Google review sync (secured by X-Cron-Secret)",

    # Developer Platform Authentication & Static Pages
    ("POST", "/api/developer/auth/login"): "Developer platform session login",
    ("POST", "/api/developer/auth/logout"): "Developer platform session logout",
    ("GET", "/api/developer/auth/check"): "Developer platform session status check",
    ("GET", "/developer"): "Developer portal static HTML redirect",
    ("GET", "/developer/{rest_of_path:path}"): "Developer portal SPA static assets",
    ("GET", "/developers"): "Developer portal documentation redirect",
    ("GET", "/developers/{rest_of_path:path}"): "Developer portal SPA static assets",

    # Surprising Unauthenticated Admin Routes (P3 Security Backlog Findings)
    ("GET", "/api/admin/weather"): "P3 Backlog Finding: Unauthenticated weather endpoint under /admin router; needs require_auth or move to public",
    ("POST", "/api/admin/estimator/calculate"): "P3 Backlog Finding: Unauthenticated duplicate calculator endpoint under /admin router; needs require_auth or removal",
}
