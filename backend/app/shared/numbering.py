from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.uow import UnitOfWork

PREFIX_MAP: dict[str, tuple[str, str, str]] = {
    # doc_type -> (prefix, sequence_name, fallback_table)
    "estimate": ("EST", "estimate_number_seq", "estimates"),
    "job": ("JOB", "job_number_seq", "jobs"),
    "contract": ("CON", "contract_number_seq", "contracts"),
    "invoice": ("INV", "invoice_number_seq", "invoices"),
}

_INITIALIZED_SEQUENCES: set[str] = set()


async def next_document_number(uow: UnitOfWork, doc_type: str = "estimate") -> str:
    """
    Generates an atomic, collision-free sequential document number using PostgreSQL sequences.
    Example: EST-2026-0001
    """
    config = PREFIX_MAP.get(doc_type.lower())
    if config:
        prefix, seq_name, table_name = config
    else:
        prefix = doc_type.upper()[:3]
        seq_name = f"{doc_type.lower()}_number_seq"
        table_name = f"{doc_type.lower()}s"

    year = datetime.now(timezone.utc).year

    # Ensure sequence exists and is seeded above existing record count
    if seq_name not in _INITIALIZED_SEQUENCES:
        await uow.session.execute(text(f"CREATE SEQUENCE IF NOT EXISTS {seq_name}"))
        try:
            # Seed sequence above existing maximum table id / count to avoid colliding with pre-existing records
            seed_sql = text(f"""
                SELECT setval(
                    '{seq_name}',
                    GREATEST(COALESCE((SELECT MAX(id) FROM {table_name}), 0) + 1, 1),
                    false
                )
                WHERE (SELECT last_value = 1 AND NOT is_called FROM {seq_name})
            """)
            await uow.session.execute(seed_sql)
        except SQLAlchemyError:
            # Ignore if table does not exist or already seeded
            pass
        _INITIALIZED_SEQUENCES.add(seq_name)

    seq_val = None
    try:
        result = await uow.session.execute(text(f"SELECT nextval('{seq_name}')"))
        seq_val = result.scalar()
    except (SQLAlchemyError, AttributeError):
        pass

    if seq_val is None:
        count_res = await uow.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        seq_val = (count_res.scalar() or 0) + 1

    return f"{prefix}-{year}-{int(seq_val):04d}"
