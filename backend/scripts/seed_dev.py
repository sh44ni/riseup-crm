"""Seed a single local-development owner account.

DEV ONLY. Replaces the old ``backend/seed_users.py`` which hard-coded three
owner accounts with a shared password and a wildcard API key.

Usage (from ``backend/``)::

    SEED_OWNER_EMAIL=you@example.com SEED_OWNER_PASSWORD='<12+ chars>' \
        python scripts/seed_dev.py

Safety rules:
* Refuses to run unless the effective environment is dev-like.
* Credentials come from the environment only - nothing is hard-coded.
* Does not create any API key.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import get_database_url  # noqa: E402
from app.core.security import hash_scrypt_password  # noqa: E402

MIN_PASSWORD_LENGTH = 12


def read_seed_credentials(environ=None) -> tuple[str, str, str]:
    """Return (email, password, name) from the environment or raise SystemExit."""
    env = os.environ if environ is None else environ
    email = (env.get("SEED_OWNER_EMAIL") or "").strip().lower()
    password = env.get("SEED_OWNER_PASSWORD") or ""
    name = (env.get("SEED_OWNER_NAME") or "Dev Owner").strip()
    if not email or "@" not in email:
        raise SystemExit("SEED_OWNER_EMAIL must be set to a valid email address.")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise SystemExit(f"SEED_OWNER_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters.")
    return email, password, name


def assert_dev_environment() -> None:
    if not settings.is_dev_like:
        raise SystemExit(
            "Refusing to seed: effective environment is not dev-like "
            "(check ENVIRONMENT / APP_ENV)."
        )


async def main() -> None:
    assert_dev_environment()
    email, password, name = read_seed_credentials()
    pw_hash, salt = hash_scrypt_password(password)

    engine = create_async_engine(get_database_url())
    try:
        async with engine.begin() as conn:
            row = (
                await conn.execute(
                    text("SELECT id FROM users WHERE LOWER(email) = LOWER(:email)"),
                    {"email": email},
                )
            ).first()
            if row:
                await conn.execute(
                    text(
                        "UPDATE users SET password_hash = :h, salt = :s, role = 'owner', "
                        "status = 'active' WHERE id = :id"
                    ),
                    {"h": pw_hash, "s": salt, "id": row[0]},
                )
                print(f"Updated existing owner {email} (id={row[0]}).")
            else:
                await conn.execute(
                    text(
                        "INSERT INTO users (name, email, password_hash, salt, role, status, permissions) "
                        "VALUES (:name, :email, :h, :s, 'owner', 'active', '{}')"
                    ),
                    {"name": name, "email": email, "h": pw_hash, "s": salt},
                )
                print(f"Created owner {email}.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
