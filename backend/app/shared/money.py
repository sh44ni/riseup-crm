from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Annotated, Any
from pydantic import BeforeValidator, PlainSerializer

CENTS = Decimal("0.01")


def quantize_money(value: Decimal | float | int | str | None) -> Decimal:
    """Safely converts any monetary input to a Decimal rounded to 2 decimal places."""
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(CENTS, rounding=ROUND_HALF_UP)
    try:
        # Avoid float representation errors by converting float via str
        return Decimal(str(value)).quantize(CENTS, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ValueError(f"Invalid monetary amount: {value}") from exc


def format_currency(value: Decimal | float | int | str | None) -> str:
    """Formats monetary amount to standard US currency string e.g. '$1,250.00'."""
    d = quantize_money(value)
    return f"${d:,.2f}"


def serialize_money(v: Decimal) -> float:
    """JSON serializer returning 2-decimal float for frontend API contract compatibility."""
    return float(quantize_money(v))


Money = Annotated[
    Decimal,
    BeforeValidator(quantize_money),
    PlainSerializer(serialize_money, return_type=float, when_used="json"),
]
