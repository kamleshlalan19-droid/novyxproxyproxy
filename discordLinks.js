import crypto from "crypto";
import pool from "./db.js";

const LINK_CODE_TTL_MINUTES = 15;
const LINK_CODE_LENGTH = 8;

const generateLinkCode = () =>
    crypto
        .randomBytes(12)
        .toString("base64")
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, LINK_CODE_LENGTH);

export const getDiscordLinkForUser = async (userId) => {
    if (!userId) {
        return null;
    }

    const result = await pool.query(
        `SELECT user_id, discord_user_id, discord_username, discord_global_name, linked_at, updated_at
         FROM discord_account_links
         WHERE user_id = $1`,
        [userId]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
};

export const getDiscordLinkSummaryForUser = async (userId) => {
    const [linkResult, codeResult] = await Promise.all([
        getDiscordLinkForUser(userId),
        pool.query(
            `SELECT code, expires_at, created_at
             FROM discord_link_codes
             WHERE user_id = $1
               AND claimed_at IS NULL
               AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        ),
    ]);

    const activeCode = codeResult.rowCount > 0 ? codeResult.rows[0] : null;

    return {
        linked: Boolean(linkResult),
        link: linkResult,
        pendingCode: activeCode
            ? {
                code: activeCode.code,
                expiresAt: activeCode.expires_at,
                createdAt: activeCode.created_at,
            }
            : null,
    };
};

export const createDiscordLinkCodeForUser = async (userId) => {
    if (!userId) {
        throw new Error("Missing user id");
    }

    await pool.query(
        `DELETE FROM discord_link_codes
         WHERE user_id = $1
           OR claimed_at IS NOT NULL
           OR expires_at <= NOW()`,
        [userId]
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateLinkCode();

        try {
            const result = await pool.query(
                `INSERT INTO discord_link_codes (code, user_id, expires_at)
                 VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)
                 RETURNING code, expires_at, created_at`,
                [code, userId, LINK_CODE_TTL_MINUTES]
            );

            return {
                code: result.rows[0].code,
                expiresAt: result.rows[0].expires_at,
                createdAt: result.rows[0].created_at,
            };
        } catch (error) {
            if (error.code !== "23505") {
                throw error;
            }
        }
    }

    throw new Error("Failed to create a unique Discord link code");
};

export const unlinkDiscordAccountForUser = async (userId) => {
    if (!userId) {
        return;
    }

    await Promise.all([
        pool.query("DELETE FROM discord_account_links WHERE user_id = $1", [userId]),
        pool.query("DELETE FROM discord_link_codes WHERE user_id = $1", [userId]),
    ]);
};

export const claimDiscordLinkCode = async ({
    code,
    discordUserId,
    discordUsername,
    discordGlobalName,
}) => {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode || !discordUserId) {
        return { ok: false, error: "Missing link code or Discord account." };
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const codeResult = await client.query(
            `SELECT code, user_id, expires_at, claimed_at
             FROM discord_link_codes
             WHERE code = $1
             FOR UPDATE`,
            [normalizedCode]
        );

        if (codeResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return { ok: false, error: "That link code was not found." };
        }

        const codeRow = codeResult.rows[0];

        if (codeRow.claimed_at) {
            await client.query("ROLLBACK");
            return { ok: false, error: "That link code has already been used." };
        }

        if (new Date(codeRow.expires_at) <= new Date()) {
            await client.query("ROLLBACK");
            return { ok: false, error: "That link code has expired." };
        }

        const existingDiscordResult = await client.query(
            `SELECT user_id
             FROM discord_account_links
             WHERE discord_user_id = $1
             FOR UPDATE`,
            [discordUserId]
        );

        if (
            existingDiscordResult.rowCount > 0 &&
            Number(existingDiscordResult.rows[0].user_id) !== Number(codeRow.user_id)
        ) {
            await client.query("ROLLBACK");
            return {
                ok: false,
                error: "That Discord account is already linked to another CanLite account.",
            };
        }

        await client.query(
            `INSERT INTO discord_account_links (
                user_id,
                discord_user_id,
                discord_username,
                discord_global_name,
                linked_at,
                updated_at
            )
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT (user_id) DO UPDATE
             SET discord_user_id = EXCLUDED.discord_user_id,
                 discord_username = EXCLUDED.discord_username,
                 discord_global_name = EXCLUDED.discord_global_name,
                 updated_at = NOW()`,
            [codeRow.user_id, discordUserId, discordUsername || null, discordGlobalName || null]
        );

        await client.query(
            `UPDATE discord_link_codes
             SET claimed_at = NOW()
             WHERE code = $1`,
            [normalizedCode]
        );

        await client.query(
            `DELETE FROM discord_link_codes
             WHERE user_id = $1
               AND code <> $2`,
            [codeRow.user_id, normalizedCode]
        );

        await client.query("COMMIT");

        return {
            ok: true,
            userId: codeRow.user_id,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
