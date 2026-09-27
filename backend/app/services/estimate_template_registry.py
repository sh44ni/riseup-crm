"""Estimate template registry for future-proofing multiple template types."""

from typing import Any

TEMPLATE_REGISTRY: list[dict[str, Any]] = [
    {
        "id": "two-options",
        "label": "2 Options Estimate",
        "status": "active",
        "pageCount": 2,
        "description": "Professional 2-page proposal with two plan options, add-ons, and special lock-in pricing.",
        "templateKey": "two_options_estimate",  # maps to Jinja2 template filename
    },
    {
        "id": "three-plans",
        "label": "3 Plans Estimate",
        "status": "soon",
        "pageCount": 2,
        "description": "Three-tier Good / Better / Best roofing proposal with detailed scope comparison.",
        "templateKey": "three_plans_estimate",
    },
    {
        "id": "premium-proposal",
        "label": "Premium 4-Page Proposal",
        "status": "soon",
        "pageCount": 4,
        "description": "Full executive proposal with project timeline, crew bios, and portfolio gallery.",
        "templateKey": "premium_4page_proposal",
    },
    {
        "id": "single-service",
        "label": "Single Service Estimate",
        "status": "soon",
        "pageCount": 1,
        "description": "Simple one-page estimate for single-scope services (gutters, repairs, etc.).",
        "templateKey": "single_service_estimate",
    },
]


def get_template(template_id: str) -> dict[str, Any] | None:
    """Get a template definition by ID."""
    for t in TEMPLATE_REGISTRY:
        if t["id"] == template_id:
            return t
    return None


def get_active_templates() -> list[dict[str, Any]]:
    """Get all templates with status 'active'."""
    return [t for t in TEMPLATE_REGISTRY if t["status"] == "active"]


def get_all_templates() -> list[dict[str, Any]]:
    """Get the full template registry."""
    return TEMPLATE_REGISTRY
