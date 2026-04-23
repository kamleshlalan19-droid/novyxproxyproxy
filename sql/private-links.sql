CREATE TABLE IF NOT EXISTS private_links (
    id BIGSERIAL PRIMARY KEY,
    owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL UNIQUE,
    cover_url TEXT NOT NULL,
    login_path TEXT NOT NULL,
    link_source TEXT NOT NULL DEFAULT 'byo',
    monthly_cost_credits NUMERIC(10, 2) NOT NULL DEFAULT 0,
    slush_pool_credits NUMERIC(10, 2) NOT NULL DEFAULT 0,
    provider_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT private_links_owner_unique UNIQUE (owner_user_id),
    CONSTRAINT private_links_cost_nonnegative CHECK (monthly_cost_credits >= 0),
    CONSTRAINT private_links_slush_nonnegative CHECK (slush_pool_credits >= 0)
);

CREATE TABLE IF NOT EXISTS private_link_members (
    link_id BIGINT NOT NULL REFERENCES private_links(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (link_id, user_id)
);

CREATE TABLE IF NOT EXISTS private_link_contributions (
    id BIGSERIAL PRIMARY KEY,
    link_id BIGINT NOT NULL REFERENCES private_links(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_credits NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT private_link_contributions_amount_positive CHECK (amount_credits > 0)
);

CREATE INDEX IF NOT EXISTS private_link_members_user_id_idx
    ON private_link_members (user_id);

CREATE INDEX IF NOT EXISTS private_link_contributions_link_id_idx
    ON private_link_contributions (link_id, created_at DESC);
