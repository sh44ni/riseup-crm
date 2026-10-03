from __future__ import annotations

import re
from typing import Any, Sequence
from sqlalchemy import TextClause, text

_SAFE_IDENTIFIER_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def build_update(
    table_name: str,
    allowed_columns: Sequence[str] | set[str],
    changes: dict[str, Any],
    where_clause: str = "id = :id",
    where_params: dict[str, Any] | None = None,
    include_updated_at: bool = True,
    returning: str | None = "*",
) -> tuple[TextClause | None, dict[str, Any]]:
    """
    Builds a secure, parameterised dynamic UPDATE SQL query from an allow-list of columns.

    Returns:
        (statement, params) tuple. If changes contains no allowed columns, returns (None, {}).
    """
    if not _SAFE_IDENTIFIER_RE.match(table_name):
        raise ValueError(f"Invalid table name: {table_name}")

    allowed_set = set(allowed_columns)
    set_clauses: list[str] = []
    params: dict[str, Any] = {}

    if where_params:
        params.update(where_params)

    for key, value in changes.items():
        if key in allowed_set:
            if not _SAFE_IDENTIFIER_RE.match(key):
                continue
            param_key = f"val_{key}"
            set_clauses.append(f"{key} = :{param_key}")
            params[param_key] = value

    if not set_clauses:
        return None, {}

    if include_updated_at and "updated_at" in allowed_set and "updated_at" not in changes:
        set_clauses.append("updated_at = NOW()")

    returning_clause = f" RETURNING {returning}" if returning else ""
    sql_str = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE {where_clause}{returning_clause}"
    return text(sql_str), params
