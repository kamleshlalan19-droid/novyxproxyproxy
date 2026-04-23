import pool from "./db.js";
import routePool from "./routeDb.js";
import { getCreditBalance, roundCredits, setCreditBalance } from "./store.js";
import {
    MAX_PRIVATE_LINKS,
    PRIVATE_LINK_SOURCE,
    MAX_PRIVATE_LINK_MEMBERS,
    getOwnedPrivateLink,
    getAccountPrivateLink,
    isValidDomain,
    isValidHttpUrl,
    isValidPrivateLinkPath,
    normalizeLoginPath,
    refreshPrivateLink,
    userCanAccessPrivateLink,
} from "./privateLinks.js";

const BLOCKED_DOMAIN_PARTS = [
    "104.36.85.249",
    "104-36-85-249",
    "nip.io",
    "sslip.io",
    "plesk.page",
];

export const PRIVATE_LINK_PLAN_DEFAULTS = {
    [PRIVATE_LINK_SOURCE.BRING_YOUR_OWN]: {
        monthlyCostCredits: 0,
        providerEnabled: true,
    },
    [PRIVATE_LINK_SOURCE.PROVIDED]: {
        monthlyCostCredits: 10,
        providerEnabled: false,
    },
};

export const canUsePrivateLinkDomain = (domain) => {
    return !BLOCKED_DOMAIN_PARTS.some((blockedPart) => domain.includes(blockedPart));
};

const getRouteTableUrlForDomain = (domain) => `https://${String(domain || "").trim().toLowerCase()}`;

export const validatePrivateLinkInput = ({ domain, coverUrl, loginPath, linkSource }) => {
    const normalizedDomain = String(domain || "").trim().toLowerCase();
    const normalizedCoverUrl = String(coverUrl || "").trim();
    const normalizedLoginPath = normalizeLoginPath(loginPath);
    const normalizedLinkSource = String(linkSource || PRIVATE_LINK_SOURCE.BRING_YOUR_OWN);
    const planDefaults = PRIVATE_LINK_PLAN_DEFAULTS[normalizedLinkSource];

    if (!planDefaults) {
        return { error: "Invalid private link type" };
    }

    if (normalizedLinkSource === PRIVATE_LINK_SOURCE.PROVIDED && !planDefaults.providerEnabled) {
        return { error: "Provided links are not enabled yet" };
    }

    if (!isValidDomain(normalizedDomain)) {
        return { error: "Enter a valid domain" };
    }

    if (!canUsePrivateLinkDomain(normalizedDomain)) {
        return { error: "That domain cannot be used as a private link" };
    }

    if (!isValidHttpUrl(normalizedCoverUrl)) {
        return { error: "Enter a valid cover URL" };
    }

    if (!isValidPrivateLinkPath(normalizedLoginPath)) {
        return { error: "Login path must start with / and only use letters, numbers, -, _, or /" };
    }

    return {
        value: {
            domain: normalizedDomain,
            coverUrl: normalizedCoverUrl,
            loginPath: normalizedLoginPath,
            linkSource: normalizedLinkSource,
            planDefaults,
        },
    };
};

export const saveOwnedPrivateLink = async (userId, input) => {
    const validation = validatePrivateLinkInput(input);
    if (validation.error) {
        return validation;
    }

    const normalizedLinkId = Number(input?.id) || null;
    const { domain, coverUrl, loginPath, linkSource, planDefaults } = validation.value;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const ownedLinks = await client.query(
            "SELECT id FROM private_links WHERE owner_user_id = $1 ORDER BY created_at DESC, id DESC FOR UPDATE",
            [userId]
        );

        const conflictingDomain = await client.query(
            "SELECT id, owner_user_id FROM private_links WHERE domain = $1 FOR UPDATE",
            [domain]
        );

        const existingRoute = await routePool.query(
            "SELECT 1 FROM routestable WHERE lower(url) = $1 LIMIT 1",
            [getRouteTableUrlForDomain(domain)]
        );

        if (conflictingDomain.rowCount > 0 && Number(conflictingDomain.rows[0].id) !== normalizedLinkId) {
            await client.query("ROLLBACK");
            return { error: "That domain is already in use", status: 400 };
        }

        if (existingRoute.rowCount > 0) {
            await client.query("ROLLBACK");
            return {
                error: "That domain has already been used or visited before. Private link domains must be completely unused.",
                status: 400,
            };
        }

        const existingLink = normalizedLinkId
            ? ownedLinks.rows.find((link) => Number(link.id) === normalizedLinkId)
            : null;

        let linkId;
        if (normalizedLinkId && !existingLink) {
            await client.query("ROLLBACK");
            return { error: "Private link not found", status: 404 };
        }

        if (existingLink) {
            linkId = existingLink.id;
            await client.query(
                `UPDATE private_links
                 SET domain = $1,
                     cover_url = $2,
                     login_path = $3,
                     link_source = $4,
                     monthly_cost_credits = $5,
                     provider_enabled = $6,
                     updated_at = NOW()
                 WHERE id = $7`,
                [domain, coverUrl, loginPath, linkSource, planDefaults.monthlyCostCredits, planDefaults.providerEnabled, linkId]
            );
        } else {
            if (ownedLinks.rowCount >= MAX_PRIVATE_LINKS) {
                await client.query("ROLLBACK");
                return { error: `You can only create up to ${MAX_PRIVATE_LINKS} private links`, status: 400 };
            }

            const insertResult = await client.query(
                `INSERT INTO private_links (
                    owner_user_id,
                    domain,
                    cover_url,
                    login_path,
                    link_source,
                    monthly_cost_credits,
                    slush_pool_credits,
                    provider_enabled
                ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7)
                RETURNING id`,
                [userId, domain, coverUrl, loginPath, linkSource, planDefaults.monthlyCostCredits, planDefaults.providerEnabled]
            );
            linkId = insertResult.rows[0].id;
        }

        await client.query("COMMIT");
        return {
            privateLink: await refreshPrivateLink(linkId),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const addPrivateLinkMemberForOwner = async (owner, linkId, email) => {
    const normalizedLinkId = Number(linkId);
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedLinkId) {
        return { error: "Invalid private link", status: 400 };
    }

    if (!normalizedEmail) {
        return { error: "Enter an email", status: 400 };
    }

    const privateLink = await getOwnedPrivateLink(owner.id, normalizedLinkId);
    if (!privateLink) {
        return { error: "Create your private link first", status: 404 };
    }

    if (privateLink.members.length >= MAX_PRIVATE_LINK_MEMBERS - 1) {
        return { error: `You can only have ${MAX_PRIVATE_LINK_MEMBERS} total people on a private link, including the owner`, status: 400 };
    }

    if (normalizedEmail === String(owner.email || "").toLowerCase()) {
        return { error: "You already own this link", status: 400 };
    }

    const targetResult = await pool.query(
        "SELECT id, email FROM users WHERE lower(email) = $1",
        [normalizedEmail]
    );

    if (targetResult.rowCount === 0) {
        return { error: "No account found for that email", status: 404 };
    }

    const targetUser = targetResult.rows[0];
    const alreadyExists = privateLink.members.some((member) => Number(member.userId) === Number(targetUser.id));

    if (alreadyExists) {
        return { error: "That account already has access", status: 400 };
    }

    await pool.query(
        `INSERT INTO private_link_members (link_id, user_id, invited_by_user_id)
         VALUES ($1, $2, $3)`,
        [privateLink.id, targetUser.id, owner.id]
    );

    return {
        privateLink: await refreshPrivateLink(privateLink.id),
    };
};

export const removePrivateLinkMemberForOwner = async (ownerId, linkId, memberUserId) => {
    const normalizedLinkId = Number(linkId);
    const normalizedMemberUserId = Number(memberUserId);
    if (!normalizedLinkId) {
        return { error: "Invalid private link", status: 400 };
    }

    if (!normalizedMemberUserId) {
        return { error: "Invalid member", status: 400 };
    }

    const privateLink = await getOwnedPrivateLink(ownerId, normalizedLinkId);
    if (!privateLink) {
        return { error: "Private link not found", status: 404 };
    }

    await pool.query(
        "DELETE FROM private_link_members WHERE link_id = $1 AND user_id = $2",
        [privateLink.id, normalizedMemberUserId]
    );

    return {
        privateLink: await refreshPrivateLink(privateLink.id),
    };
};

export const contributeToPrivateLink = async ({ user, hostname, linkId, amount }) => {
    const normalizedLinkId = Number(linkId);
    const normalizedAmount = roundCredits(amount);
    if (!normalizedLinkId) {
        return { error: "Invalid private link", status: 400 };
    }

    if (normalizedAmount <= 0) {
        return { error: "Enter a contribution above 0 credits", status: 400 };
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const privateLink = await getAccountPrivateLink({
            userId: user.id,
            hostname,
        });

        if (!privateLink) {
            await client.query("ROLLBACK");
            return { error: "No private link found for this account or host", status: 404 };
        }

        if (Number(privateLink.id) !== normalizedLinkId) {
            await client.query("ROLLBACK");
            return { error: "The slush pool is only available on that private link", status: 403 };
        }

        const canAccess = await userCanAccessPrivateLink(privateLink, user.id);
        if (!canAccess) {
            await client.query("ROLLBACK");
            return { error: "You do not have access to contribute to this link", status: 403 };
        }

        const lockedUser = await client.query(
            "SELECT id, data FROM users WHERE id = $1 FOR UPDATE",
            [user.id]
        );

        const currentBalance = getCreditBalance(lockedUser.rows[0].data);
        if (currentBalance < normalizedAmount) {
            await client.query("ROLLBACK");
            return { error: "Not enough credits", status: 400 };
        }

        await client.query(
            "UPDATE users SET data = $1 WHERE id = $2",
            [setCreditBalance(lockedUser.rows[0].data, currentBalance - normalizedAmount), user.id]
        );

        await client.query(
            `UPDATE private_links
             SET slush_pool_credits = slush_pool_credits + $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [normalizedAmount, privateLink.id]
        );

        await client.query(
            "INSERT INTO private_link_contributions (link_id, user_id, amount_credits) VALUES ($1, $2, $3)",
            [privateLink.id, user.id, normalizedAmount]
        );

        await client.query("COMMIT");

        return {
            credits: roundCredits(currentBalance - normalizedAmount),
            privateLink: await refreshPrivateLink(privateLink.id),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
