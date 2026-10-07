import pytest
from sqlalchemy import text
from app.services.sync import (
    find_or_create_client,
    find_active_lead,
    merge_inquiry_into_lead,
)


@pytest.mark.asyncio
async def test_find_active_lead_matches_by_client_id_and_phone(db):
    # 1. Create client
    cid = await find_or_create_client(db, {
        "fullName": "Test Homeowner",
        "phone": "(760) 555-4321",
        "email": "testhomeowner@example.com",
    })

    # 2. Insert primary lead
    res = await db.execute(text("""
        INSERT INTO leads (
            client_id, form_type, full_name, phone, email, status, pipeline_stage,
            lead_source, lead_source_detail, notes, created_at
        ) VALUES (
            :cid, 'storm_promo', 'Test Homeowner', '(760) 555-4321', 'testhomeowner@example.com',
            'contacted', 'initial_call', 'storm_promo_popup', '⚡ $1,000 Off Storm Voucher',
            '⚡ El Niño Storm Promo Claim: $1,000 Off voucher applied.', NOW()
        ) RETURNING id
    """), {"cid": cid})
    lead_id = res.scalar_one()

    # 3. Test find_active_lead by client_id
    found_by_cid = await find_active_lead(db, client_id=cid)
    assert found_by_cid is not None
    assert found_by_cid["id"] == lead_id
    assert found_by_cid["pipeline_stage"] == "initial_call"

    # 4. Test find_active_lead by raw/unformatted phone
    found_by_phone = await find_active_lead(db, phone="7605554321")
    assert found_by_phone is not None
    assert found_by_phone["id"] == lead_id

    # 5. Test find_active_lead by lowercase email
    found_by_email = await find_active_lead(db, email="TESTHOMEOWNER@EXAMPLE.COM")
    assert found_by_email is not None
    assert found_by_email["id"] == lead_id


@pytest.mark.asyncio
async def test_merge_inquiry_into_lead_preserves_stage_and_logs_activity(db):
    # 1. Create client
    cid = await find_or_create_client(db, {
        "fullName": "Jennifer Dedupe",
        "phone": "(619) 555-8899",
        "email": "jenniferdedupe@example.com",
    })

    # 2. Initial promo lead
    res = await db.execute(text("""
        INSERT INTO leads (
            client_id, form_type, full_name, phone, email, status, pipeline_stage,
            lead_source, lead_source_detail, notes, created_at
        ) VALUES (
            :cid, 'storm_promo', 'Jennifer Dedupe', '(619) 555-8899', 'jenniferdedupe@example.com',
            'contacted', 'initial_call', 'storm_promo_popup', '⚡ $1,000 Off Storm Voucher',
            '⚡ Initial voucher claimed.', NOW()
        ) RETURNING id
    """), {"cid": cid})
    lead_id = res.scalar_one()

    existing = await find_active_lead(db, client_id=cid)
    assert existing is not None

    # 3. Simulate second submission (Contact form with new address and message)
    merged_id = await merge_inquiry_into_lead(
        db,
        existing,
        client_id=cid,
        form_type="contact",
        lead_source="website_contact",
        lead_source_detail="✉️ Website Contact Form",
        subject="General Inquiry",
        message="I also need an estimate on solar detachment and new underlayment.",
        address="1221 Positas Rd",
        city="Chula Vista",
        zip_code="91911",
    )
    assert merged_id == lead_id

    # 4. Verify lead was updated without demoting pipeline_stage
    lead_row = (await db.execute(
        text("SELECT * FROM leads WHERE id = :lid"),
        {"lid": lead_id}
    )).mappings().first()

    assert lead_row["pipeline_stage"] == "initial_call"  # Preserved!
    assert lead_row["address"] == "1221 Positas Rd"      # Backfilled!
    assert lead_row["city"] == "Chula Vista"            # Backfilled!
    assert "solar detachment and new underlayment" in lead_row["notes"]

    # 5. Verify activity log entry was recorded
    act = (await db.execute(
        text("SELECT * FROM activities WHERE entity_type = 'lead' AND entity_id = :lid ORDER BY id DESC LIMIT 1"),
        {"lid": lead_id}
    )).mappings().first()

    assert act is not None
    assert act["activity_type"] == "form_submission"
    assert "Website Contact Form Received" in act["title"]
    assert "solar detachment and new underlayment" in act["description"]
