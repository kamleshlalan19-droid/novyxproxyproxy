ALTER TABLE users
    ADD COLUMN IF NOT EXISTS consent_version TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS consent_ip TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_users_consent_version
    ON users (consent_version);

-- Apply the ad-signal tables from the sibling adserver project as well:
--   ../adserver/sql/create_url_submissions.sql
--   ../adserver/sql/create_ad_auction_tables.sql
