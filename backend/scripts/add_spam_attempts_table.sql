-- Isolated audit table for blocked spam & junk bot submissions
-- Completely separate from leads/clients tables to keep CRM pipeline 100% clean
CREATE TABLE IF NOT EXISTS spam_attempts (
    id BIGSERIAL PRIMARY KEY,
    block_reason VARCHAR(64) NOT NULL,    -- 'honeypot', 'speed_trap', 'turnstile', 'invalid_phone', 'spam_content'
    block_detail TEXT,                    -- specific trigger info (e.g. 'business_fax_honeypot_filled', 'speed_trap_triggered_400ms')
    form_type VARCHAR(64),                -- 'contact', 'estimate', 'storm_promo'
    ip_address VARCHAR(128),
    user_agent TEXT,
    page_referer TEXT,
    payload_snapshot JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spam_attempts_submitted_at ON spam_attempts (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_spam_attempts_block_reason ON spam_attempts (block_reason);
