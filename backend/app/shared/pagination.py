from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar
from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


class PageParams(BaseModel):
    """Pagination query parameters."""

    limit: int = Field(default=50, description="Items per page (max 100)")
    offset: int = Field(default=0, ge=0, description="Number of items to skip")
    cursor: str | None = Field(default=None, description="Cursor for keyset pagination")

    @field_validator("limit", mode="before")
    @classmethod
    def clamp_limit(cls, v: Any) -> int:
        try:
            val = int(v)
            return max(1, min(val, 100))
        except (ValueError, TypeError):
            return 50


class Page(BaseModel, Generic[T]):
    """Generic paginated response structure."""

    items: list[T]
    total: int | None = None
    limit: int
    offset: int
    has_more: bool = False
    next_cursor: str | None = None

    @classmethod
    def create(
        cls,
        items: Sequence[T],
        limit: int,
        offset: int = 0,
        total: int | None = None,
        next_cursor: str | None = None,
    ) -> Page[T]:
        item_list = list(items)
        has_more = (offset + len(item_list) < total) if total is not None else (len(item_list) >= limit)
        return cls(
            items=item_list,
            total=total,
            limit=limit,
            offset=offset,
            has_more=has_more,
            next_cursor=next_cursor,
        )
