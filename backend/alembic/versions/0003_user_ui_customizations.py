"""0003_user_ui_customizations

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04 04:20:00.000000

Creates per-user customization storage and carries over genuine uploads (never presets)
from the legacy shared hero/quote tables to the user who made them.
"""
import json
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine.reflection import Inspector

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

_UPLOAD_PREFIX = "/static/uploads/"


def _real(url) -> bool:
    return bool(url) and str(url).startswith(_UPLOAD_PREFIX)


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = set(inspector.get_table_names())
    if "user_ui_customizations" not in tables:
        op.create_table(
            "user_ui_customizations",
            sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("slot_key", sa.String(80), primary_key=True),
            sa.Column("config", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    def user_id_for(email):
        if not email:
            return None
        return conn.execute(sa.text("SELECT id FROM users WHERE lower(email)=lower(:e)"), {"e": email}).scalar()

    def put(uid, key, cfg):
        conn.execute(
            sa.text(
                "INSERT INTO user_ui_customizations (user_id, slot_key, config) VALUES (:u,:k,CAST(:c AS jsonb)) "
                "ON CONFLICT (user_id, slot_key) DO NOTHING"
            ),
            {"u": uid, "k": key, "c": json.dumps(cfg)},
        )

    if "crm_hero_banners" in tables:
        rows = conn.execute(
            sa.text(
                "SELECT page_id, image_url, zoom, position_x, position_y, opacity, overlay_strength, "
                "is_global, updated_by FROM crm_hero_banners"
            )
        ).mappings().all()
        for r in rows:
            if not _real(r["image_url"]):
                continue
            uid = user_id_for(r["updated_by"])
            if not uid:
                continue
            cfg = {k: r[k] for k in ("image_url", "zoom", "position_x", "position_y", "opacity", "overlay_strength")}
            if r["page_id"] == "global" or r["is_global"]:
                put(uid, "hero:all", cfg)
            else:
                put(uid, f"hero:{r['page_id']}", cfg)

    if "crm_quote_banners" in tables and "crm_quote_banner_slides" in tables:
        banners = conn.execute(sa.text("SELECT * FROM crm_quote_banners")).mappings().all()
        for b in banners:
            uid = user_id_for(b.get("updated_by"))
            if not uid:
                continue
            slides = conn.execute(
                sa.text("SELECT id, image_url, title, alt_text FROM crm_quote_banner_slides WHERE banner_id=:b ORDER BY sort_order"),
                {"b": b["id"]},
            ).mappings().all()
            real_slides = [
                {"id": str(s["id"]), "image_url": s["image_url"], "title": s["title"], "alt_text": s["alt_text"]}
                for s in slides
                if _real(s["image_url"])
            ]
            single = b.get("single_image_url") if _real(b.get("single_image_url")) else ""
            if not single and not real_slides:
                continue
            put(
                uid,
                "quote_banner",
                {
                    "mode": "slideshow" if len(real_slides) > 1 and not single else "single",
                    "single_image_url": single,
                    "slides": real_slides,
                    "link_url": b.get("link_url") or None,
                },
            )


def downgrade() -> None:
    op.drop_table("user_ui_customizations")
