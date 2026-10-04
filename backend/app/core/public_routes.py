from typing import FrozenSet, Set

# Exact public endpoints
PUBLIC_EXACT_ROUTES: FrozenSet[str] = frozenset({
    "/",
    "/health",
    "/ready",
    "/favicon.ico",
    "/openapi.json",
    "/api/admin/auth/login",
    "/api/admin/auth",
    "/api/admin/auth/verify-otp",
    "/api/admin/auth/resend-otp",
})

# Public tree prefixes
PUBLIC_PREFIX_ROUTES: FrozenSet[str] = frozenset({
    "/docs",
    "/redoc",
    "/developer",
    "/developers",
    "/api/developer",
    "/api/public",
    "/api/cron",
    "/api/contact",
    "/api/estimate",
    "/api/estimator",
    "/api/financing",
    "/api/track",
    "/api/proposal",
    "/api/reviews",
    "/api/portal",
    "/api/contract/sign",
    "/static",
})

# Master canonical registry of all public, unauthenticated backend routes
PUBLIC_BACKEND_ROUTES: FrozenSet[str] = PUBLIC_EXACT_ROUTES | PUBLIC_PREFIX_ROUTES

# Public paths that the CRM frontend router and HTTP clients recognize
CRM_PUBLIC_PAGES: FrozenSet[str] = frozenset({
    "/login",
    "/accept-invite",
    "/contract/sign",
    "/changelogs",
})

CRM_PUBLIC_API_ENDPOINTS: FrozenSet[str] = frozenset({
    "/auth/login",
    "/public/invitations",
    "/public/contracts",
    "/contract/sign",
})

def is_public_backend_route(path: str) -> bool:
    """Checks if a given URL path is a declared public route on the backend."""
    clean_path = path.rstrip("/") or "/"
    if clean_path in PUBLIC_EXACT_ROUTES or clean_path in PUBLIC_PREFIX_ROUTES:
        return True
    for prefix in PUBLIC_PREFIX_ROUTES:
        if clean_path.startswith(f"{prefix}/"):
            return True
    return False
