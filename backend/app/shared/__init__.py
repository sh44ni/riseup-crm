"""Shared domain primitives and cross-cutting helpers."""
from app.shared.activity import log_activity
from app.shared.money import Money, format_currency, quantize_money
from app.shared.numbering import next_document_number
from app.shared.pagination import Page, PageParams
from app.shared.partial_update import build_update

__all__ = [
    "log_activity",
    "Money",
    "format_currency",
    "quantize_money",
    "next_document_number",
    "Page",
    "PageParams",
    "build_update",
]
