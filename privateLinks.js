import pool from "./db.js";
import redisClient, { ensureRedis } from "./redis.js";

export const PRIVATE_LINK_CACHE_TTL_SECONDS = 60 * 60 * 24;
export const MAX_PRIVATE_LINK_MEMBERS = 20;
export const PRIVATE_LINK_SOURCE = {
    BRING_YOUR_OWN: "byo",
    PROVIDED: "provided",
};

const MISSING_SENTINEL = "__missing__";

const normalizeDomain = (value) => String(value || "").trim().toLowerCase();

export const normalizeLoginPath = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
};

export const isValidDomain = (value) => {
    const domain = normalizeDomain(value);
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain);
};

export const isValidPrivateLinkPath = (value) => {
    const path = normalizeLoginPath(value);
    return /^\/[a-z0-9/_-]*$/i.test(path);
};

export const isValidHttpUrl = (value) => {
    try {
        const url = new URL(String(value || ""));
        return ["http:", "https:"].includes(url.protocol);
    } catch {
        return false;
    }
};

const parseCredits = (value) => Math.round((Number(value) || 0) * 100) / 100;

const linkCacheKey = (domain) => `myapp:private-link:domain:${normalizeDomain(domain)}`;
const ownerCacheKey = (userId) => `myapp:private-link:owner:${userId}`;
const accessCacheKey = (linkId, userId) => `myapp:private-link:access:${linkId}:${userId}`;
const contributionsCacheKey = (linkId) => `myapp:private-link:contributions:${linkId}`;

const serializeCacheValue = (value) => JSON.stringify(value ?? MISSING_SENTINEL);

const deserializeCacheValue = (value) => {
    if (value == null) {
        return null;
    }

    const parsed = JSON.parse(value);
    return parsed === MISSING_SENTINEL ? MISSING_SENTINEL : parsed;
};

const mapLinkRow = (row) => {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        ownerUserId: row.owner_user_id,
        domain: row.domain,
        coverUrl: row.cover_url,
        loginPath: row.login_path,
        linkSource: row.link_source,
        monthlyCostCredits: parseCredits(row.monthly_cost_credits),
        slushPoolCredits: parseCredits(row.slush_pool_credits),
        providerEnabled: row.provider_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

const enrichPrivateLink = async (link) => {
    if (!link) {
        return null;
    }

    const [members, contributionSummary] = await Promise.all([
        fetchMembers(link.id),
        fetchContributionSummary(link.id),
    ]);

    return {
        ...link,
        members,
        contributionSummary,
    };
};

const fetchMembers = async (linkId) => {
    const result = await pool.query(
        `SELECT users.id, users.email, private_link_members.created_at
         FROM private_link_members
         JOIN users ON users.id = private_link_members.user_id
         WHERE private_link_members.link_id = $1
         ORDER BY lower(users.email) ASC`,
        [linkId]
    );

    return result.rows.map((row) => ({
        userId: row.id,
        email: row.email,
        addedAt: row.created_at,
    }));
};

const fetchContributionSummary = async (linkId) => {
    const cache = await ensureRedis();
    const cached = deserializeCacheValue(await cache.get(contributionsCacheKey(linkId)));

    if (cached && cached !== MISSING_SENTINEL) {
        return cached;
    }

    const result = await pool.query(
        `SELECT users.email, SUM(private_link_contributions.amount_credits)::numeric AS total_credits
         FROM private_link_contributions
         JOIN users ON users.id = private_link_contributions.user_id
         WHERE private_link_contributions.link_id = $1
         GROUP BY users.email
         ORDER BY SUM(private_link_contributions.amount_credits) DESC, lower(users.email) ASC`,
        [linkId]
    );

    const summary = result.rows.map((row) => ({
        email: row.email,
        totalCredits: parseCredits(row.total_credits),
    }));

    await cache.set(contributionsCacheKey(linkId), JSON.stringify(summary), {
        EX: PRIVATE_LINK_CACHE_TTL_SECONDS,
    });

    return summary;
};

const fetchPrivateLinkRecord = async (whereClause, params) => {
    const result = await pool.query(
        `SELECT id, owner_user_id, domain, cover_url, login_path, link_source, monthly_cost_credits,
                slush_pool_credits, provider_enabled, created_at, updated_at
         FROM private_links
         WHERE ${whereClause}
         LIMIT 1`,
        params
    );

    if (result.rowCount === 0) {
        return null;
    }

    return mapLinkRow(result.rows[0]);
};

const cachePrivateLink = async (cacheKey, value) => {
    const cache = await ensureRedis();
    await cache.set(cacheKey, serializeCacheValue(value), {
        EX: PRIVATE_LINK_CACHE_TTL_SECONDS,
    });
};

export const getPrivateLinkByDomain = async (domain) => {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) {
        return null;
    }

    const cache = await ensureRedis();
    const cached = deserializeCacheValue(await cache.get(linkCacheKey(normalizedDomain)));
    if (cached === MISSING_SENTINEL) {
        return null;
    }
    if (cached) {
        return cached;
    }

    const link = await fetchPrivateLinkRecord("domain = $1", [normalizedDomain]);
    await cachePrivateLink(linkCacheKey(normalizedDomain), link);
    return link;
};

export const getOwnedPrivateLink = async (ownerUserId) => {
    if (!ownerUserId) {
        return null;
    }

    const cache = await ensureRedis();
    const cached = deserializeCacheValue(await cache.get(ownerCacheKey(ownerUserId)));
    if (cached === MISSING_SENTINEL) {
        return null;
    }
    if (cached) {
        return cached;
    }

    const linkRecord = await fetchPrivateLinkRecord("owner_user_id = $1", [ownerUserId]);
    const link = await enrichPrivateLink(linkRecord);
    await cachePrivateLink(ownerCacheKey(ownerUserId), link);
    return link;
};

export const userCanAccessPrivateLink = async (link, userId) => {
    if (!link || !userId) {
        return false;
    }

    if (Number(link.ownerUserId) === Number(userId)) {
        return true;
    }

    const cache = await ensureRedis();
    const key = accessCacheKey(link.id, userId);
    const cached = await cache.get(key);
    if (cached != null) {
        return cached === "1";
    }

    const result = await pool.query(
        "SELECT 1 FROM private_link_members WHERE link_id = $1 AND user_id = $2",
        [link.id, userId]
    );

    const allowed = result.rowCount > 0;
    await cache.set(key, allowed ? "1" : "0", {
        EX: PRIVATE_LINK_CACHE_TTL_SECONDS,
    });
    return allowed;
};

export const invalidatePrivateLinkCaches = async (link) => {
    if (!link) {
        return;
    }

    const cache = await ensureRedis();
    const deletions = [
        linkCacheKey(link.domain),
        ownerCacheKey(link.ownerUserId),
        contributionsCacheKey(link.id),
    ];

    for (const member of link.members || []) {
        deletions.push(accessCacheKey(link.id, member.userId));
    }

    await cache.del(deletions);
};

export const getAccountPrivateLink = async ({ userId, hostname }) => {
    const [ownedLink, hostLink] = await Promise.all([
        getOwnedPrivateLink(userId),
        getPrivateLinkByDomain(hostname),
    ]);

    if (hostLink && (await userCanAccessPrivateLink(hostLink, userId))) {
        const fullHostLink =
            ownedLink && Number(ownedLink.id) === Number(hostLink.id)
                ? ownedLink
                : await enrichPrivateLink(hostLink);

        return {
            ...fullHostLink,
            role: Number(hostLink.ownerUserId) === Number(userId) ? "owner" : "member",
            activeHost: true,
        };
    }

    if (ownedLink) {
        return {
            ...ownedLink,
            role: "owner",
            activeHost: normalizeDomain(hostname) === ownedLink.domain,
        };
    }

    return null;
};

export const refreshPrivateLink = async (linkId) => {
    const result = await pool.query(
        "SELECT domain, owner_user_id FROM private_links WHERE id = $1",
        [linkId]
    );

    if (result.rowCount === 0) {
        return null;
    }

    const existing = await enrichPrivateLink(await fetchPrivateLinkRecord("id = $1", [linkId]));
    await invalidatePrivateLinkCaches(existing);
    await cachePrivateLink(linkCacheKey(existing.domain), existing);
    await cachePrivateLink(ownerCacheKey(existing.ownerUserId), existing);
    return existing;
};
