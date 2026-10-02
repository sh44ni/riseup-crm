import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

async def main():
    statements = [
        "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS template_key TEXT DEFAULT 'multi_option_proposal';",
        "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS proposal_data JSONB;",
        "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS pdf_url TEXT;",
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP WITH TIME ZONE;",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_category TEXT DEFAULT 'Rise Up';",
        "ALTER TABLE leads ALTER COLUMN estimated_value DROP NOT NULL;",
    ]
    async with engine.begin() as conn:
        for stmt in statements:
            print(f"Executing: {stmt}")
            await conn.execute(text(stmt))
    print("Migration successfully applied!")

    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name IN ('follow_up_at', 'last_contact_at', 'work_category')"))
        for row in res.fetchall():
            print(f"Verified Column: {row[0]}.{row[1]} ({row[2]})")

if __name__ == "__main__":
    asyncio.run(main())
