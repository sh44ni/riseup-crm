from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.config import settings

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies strict enterprise security headers and cache controls across all API responses.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # Baseline defensive headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

        # HSTS for production and HTTPS traffic
        if request.url.scheme == "https" or settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Frame busting: prevent clickjacking
        if "X-Frame-Options" not in response.headers:
            response.headers["X-Frame-Options"] = "DENY"

        # Prevent browser caching of sensitive authenticated endpoints
        if request.url.path.startswith("/api/admin"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response
