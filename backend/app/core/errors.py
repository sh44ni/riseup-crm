from __future__ import annotations

from typing import Any


class DomainError(Exception):
    """Base class for all business/domain errors."""

    code: str = "DOMAIN_ERROR"
    status_code: int = 400

    def __init__(
        self,
        message: str,
        details: dict[str, Any] | list[Any] | None = None,
        code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}
        if code:
            self.code = code

    def to_dict(self, request_id: str | None = None) -> dict[str, Any]:
        return {
            "ok": False,
            "detail": self.message,
            "message": self.message,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            },
            "requestId": request_id or "",
        }


class NotFound(DomainError):
    code = "NOT_FOUND"
    status_code = 404


class Forbidden(DomainError):
    code = "FORBIDDEN"
    status_code = 403


class Conflict(DomainError):
    code = "CONFLICT"
    status_code = 409


class ValidationFailed(DomainError):
    code = "VALIDATION_FAILED"
    status_code = 422


class Unauthenticated(DomainError):
    code = "UNAUTHENTICATED"
    status_code = 401


class ExternalServiceError(DomainError):
    code = "EXTERNAL_SERVICE_ERROR"
    status_code = 502
