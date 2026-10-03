"""Deterministic test database seeder for Playwright E2E test suite.

Creates deterministic accounts (one per role), company settings, and sample
leads across pipeline stages for reproducible end-to-end testing.

Safety rules:
* Refuses to run unless settings.is_dev_like is True.
* Uses credentials from env or deterministic test defaults.
* Never run against production databases.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import get_database_url  # noqa: E402
from app.core.security import hash_scrypt_password  # noqa: E402

E2E_PASSWORD = os.environ.get("E2E_TEST_PASSWORD", "E2eTestPassword123!")

ROLES_USERS = [
    {
        "name": "E2E Owner",
        "email": "e2e_owner@riseuprac.local",
        "role": "owner",
        "permissions": ["*"],
    },
    {
        "name": "E2E Sales Rep",
        "email": "e2e_rep@riseuprac.local",
        "role": "sales_rep",
        "permissions": ["leads.view", "leads.create", "estimates.create", "contracts.view"],
    },
    {
        "name": "E2E Project Manager",
        "email": "e2e_pm@riseuprac.local",
        "role": "project_manager",
        "permissions": ["leads.view", "jobs.manage", "calendar.manage"],
    },
    {
        "name": "E2E Subcontractor",
        "email": "e2e_sub@riseuprac.local",
        "role": "subcontractor",
        "permissions": ["jobs.view"],
    },
]

SAMPLE_LEADS = [
    {
        "full_name": "E2E Alice Smith",
        "email": "alice.smith@example.com",
        "phone": "(760) 555-0101",
        "pipeline_stage": "cold_lead",
        "service_type": "Tile Roofing",
        "address": "101 Pacific Coast Hwy",
        "city": "Oceanside",
        "zip": "92054",
        "notes": "E2E Cold Lead test entry",
    },
    {
        "full_name": "E2E Bob Miller",
        "email": "bob.miller@example.com",
        "phone": "(760) 555-0102",
        "pipeline_stage": "initial_call",
        "service_type": "Residential Roofing",
        "address": "202 Mission Ave",
        "city": "Oceanside",
        "zip": "92054",
        "notes": "E2E Contacted test entry",
    },
    {
        "full_name": "E2E Carol Davis",
        "email": "carol.davis@example.com",
        "phone": "(760) 555-0103",
        "pipeline_stage": "estimate_scheduled",
        "service_type": "Tile Roofing",
        "address": "303 Vista Way",
        "city": "Oceanside",
        "zip": "92054",
        "notes": "E2E Estimate Scheduled entry",
    },
]


def assert_dev_environment() -> None:
    if not settings.is_dev_like:
        raise SystemExit(
            "Refusing to seed E2E data: environment is not dev-like. "
            "Never run E2E seeds against production."
        )


async def seed() -> None:
    assert_dev_environment()
    pw_hash, salt = hash_scrypt_password(E2E_PASSWORD)

    engine = create_async_engine(get_database_url())
    try:
        async with engine.begin() as conn:
            # 1. Seed deterministic users
            user_ids: dict[str, int] = {}
            for u in ROLES_USERS:
                row = (
                    await conn.execute(
                        text("SELECT id FROM users WHERE LOWER(email) = LOWER(:email)"),
                        {"email": u["email"]},
                    )
                ).first()

                perms = u["permissions"]
                if row:
                    user_id = row[0]
                    await conn.execute(
                        text(
                            "UPDATE users SET password_hash = :h, salt = :s, role = :role, "
                            "status = 'active', permissions = :p WHERE id = :id"
                        ),
                        {
                            "h": pw_hash,
                            "s": salt,
                            "role": u["role"],
                            "p": perms,
                            "id": user_id,
                        },
                    )
                    print(f"Updated user {u['email']} (id={user_id})")
                else:
                    res = await conn.execute(
                        text(
                            "INSERT INTO users (name, email, password_hash, salt, role, status, permissions) "
                            "VALUES (:name, :email, :h, :s, :role, 'active', :p) RETURNING id"
                        ),
                        {
                            "name": u["name"],
                            "email": u["email"],
                            "h": pw_hash,
                            "s": salt,
                            "role": u["role"],
                            "p": perms,
                        },
                    )
                    user_id = res.scalar()
                    print(f"Created user {u['email']} (id={user_id})")
                user_ids[u["email"]] = user_id

            owner_id = user_ids["e2e_owner@riseuprac.local"]

            # 2. Company profile is supplied by CRM default configuration


            # 3. Seed deterministic leads
            for lead in SAMPLE_LEADS:
                existing = (
                    await conn.execute(
                        text("SELECT id FROM leads WHERE LOWER(email) = LOWER(:email)"),
                        {"email": lead["email"]},
                    )
                ).first()
                if not existing:
                    await conn.execute(
                        text(
                            "INSERT INTO leads (full_name, email, phone, form_type, pipeline_stage, service_type, address, city, zip, notes, assigned_to_user_id, created_by_user_id) "
                            "VALUES (:name, :email, :phone, 'contact', :stage, :svc, :addr, :city, :zip, :notes, :owner_id, :owner_id)"
                        ),
                        {
                            "name": lead["full_name"],
                            "email": lead["email"],
                            "phone": lead["phone"],
                            "stage": lead["pipeline_stage"],
                            "svc": lead["service_type"],
                            "addr": lead["address"],
                            "city": lead["city"],
                            "zip": lead["zip"],
                            "notes": lead["notes"],
                            "owner_id": owner_id,
                        },
                    )
                    print(f"Seeded lead {lead['full_name']}")

        print("E2E database seeding completed successfully.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
