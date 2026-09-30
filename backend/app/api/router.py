from fastapi import APIRouter

# Public Routers
from app.api.public.contact import router as contact_router
from app.api.public.estimate import router as estimate_router
from app.api.public.estimator import router as estimator_router
from app.api.public.financing import router as financing_router
from app.api.public.portals import router as portals_router
from app.api.public.proposal import router as proposal_router
from app.api.public.track import router as track_router
from app.api.public.cron import router as cron_router
from app.api.public.invitations import router as invitations_router
from app.api.public.reviews import router as public_reviews_router
from app.api.public.contracts import router as public_contracts_router

# Admin Routers
from app.api.admin.auth import router as admin_auth_router
from app.api.admin.audit import router as admin_audit_router
from app.api.admin.rbac import router as admin_rbac_router
from app.api.admin.leads import router as admin_leads_router
from app.api.admin.pipeline import router as admin_pipeline_router
from app.api.admin.reports import router as admin_reports_router
from app.api.admin.clients import router as admin_clients_router
from app.api.admin.estimates import router as admin_estimates_router
from app.api.admin.jobs import router as admin_jobs_router
from app.api.admin.finances import router as admin_finances_router
from app.api.admin.calendar import router as admin_calendar_router
from app.api.admin.field import router as admin_field_router
from app.api.admin.marketing import router as admin_marketing_router
from app.api.admin.system import router as admin_system_router
from app.api.admin.integrations import router as admin_integrations_router
from app.api.admin.hero_banners import router as admin_hero_banners_router
from app.api.admin.quote_banner import router as admin_quote_banner_router
from app.api.admin.calendar_events import router as admin_calendar_events_router
from app.api.admin.user_tasks import router as admin_user_tasks_router
from app.api.admin.estimator import router as admin_estimator_router
from app.api.admin.contracts import router as admin_contracts_router
from app.api.admin.signatories import router as admin_signatories_router
from app.api.developer import router as developer_router

api_router = APIRouter()

# ── Developer & Multi-Frontend API Key Endpoints ──
api_router.include_router(developer_router)

# ── Public Endpoints ──
api_router.include_router(contact_router)
api_router.include_router(estimate_router)
api_router.include_router(estimator_router)
api_router.include_router(financing_router)
api_router.include_router(portals_router)
api_router.include_router(proposal_router)
api_router.include_router(track_router)
api_router.include_router(cron_router)
api_router.include_router(invitations_router)
api_router.include_router(public_reviews_router)
api_router.include_router(public_contracts_router)

# ── Admin Endpoints ──
api_router.include_router(admin_auth_router)
api_router.include_router(admin_audit_router)
api_router.include_router(admin_rbac_router)
api_router.include_router(admin_leads_router)
api_router.include_router(admin_pipeline_router)

# Routers mounted under /api/admin:
api_router.include_router(admin_clients_router, prefix="/api/admin", tags=["Admin Clients"])
api_router.include_router(admin_estimates_router, prefix="/api/admin", tags=["Admin Estimates"])
api_router.include_router(admin_reports_router, prefix="/api/admin", tags=["Admin Reports"])
api_router.include_router(admin_jobs_router, prefix="/api/admin", tags=["Admin Jobs"])
api_router.include_router(admin_finances_router, prefix="/api/admin", tags=["Admin Finances"])
api_router.include_router(admin_calendar_router, prefix="/api/admin", tags=["Admin Calendar & Tasks"])
api_router.include_router(admin_field_router, prefix="/api/admin", tags=["Admin Field Operations"])
api_router.include_router(admin_marketing_router, prefix="/api/admin", tags=["Admin Analytics & Marketing"])
api_router.include_router(admin_system_router, prefix="/api/admin", tags=["Admin System & Config"])
api_router.include_router(admin_integrations_router, prefix="/api/admin", tags=["Admin Integrations"])

# Ready Integration Modules:
api_router.include_router(admin_hero_banners_router, prefix="/api/admin", tags=["Admin Hero Banners"])
api_router.include_router(admin_quote_banner_router, prefix="/api/admin", tags=["Admin Quote Banner"])
api_router.include_router(admin_calendar_events_router, prefix="/api/admin", tags=["Admin Calendar Events"])
api_router.include_router(admin_user_tasks_router, prefix="/api/admin", tags=["User Personal Sticky Notes"])
api_router.include_router(admin_estimator_router, prefix="/api/admin", tags=["Admin Estimator Pricing"])
api_router.include_router(admin_contracts_router, prefix="/api/admin", tags=["Admin Contracts"])
api_router.include_router(admin_signatories_router)
