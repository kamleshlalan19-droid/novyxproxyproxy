import crypto from "crypto";
import pool from "./db.js";

export const authenticateUserCredentials = async (email, password) => {
    const saltResult = await pool.query(
        "SELECT id, salt, token, admin, password, email FROM users WHERE email = $1",
        [email]
    );

    if (saltResult.rowCount === 0) {
        return { ok: false, reason: "acc" };
    }

    const user = saltResult.rows[0];
    const hashedPass = crypto.createHash("sha256").update(password + user.salt).digest("hex");

    if (user.password !== hashedPass) {
        return { ok: false, reason: "pass" };
    }

    return {
        ok: true,
        user: {
            id: user.id,
            token: user.token,
            admin: user.admin,
            email: user.email,
        },
    };
};

export const getUserByToken = async (token) => {
    if (!token) {
        return null;
    }

    const result = await pool.query(
        "SELECT id, token, admin, data, email FROM users WHERE token = $1",
        [token]
    );

    return result.rowCount > 0 ? result.rows[0] : null;
};
