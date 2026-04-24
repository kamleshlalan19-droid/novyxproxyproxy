CREATE TABLE IF NOT EXISTS discord_account_links (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    discord_user_id TEXT NOT NULL UNIQUE,
    discord_username TEXT,
    discord_global_name TEXT,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discord_link_codes (
    code TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS discord_link_codes_user_id_idx
    ON discord_link_codes (user_id, created_at DESC);
