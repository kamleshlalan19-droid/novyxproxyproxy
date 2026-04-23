import express from "express";
import crypto from 'crypto';
import pool from './db.js';
import verifyUser from "./middleware/authAdmin.js";
import moment from "moment";
import path, { dirname } from "path";
import fs from 'node:fs/promises';
import { fileURLToPath } from "url";
import requestIp from'request-ip';
import { getCreditBalance, roundCredits, setCreditBalance } from "./store.js";
import redisClient from "./redis.js";
import { authenticateUserCredentials } from "./auth.js";
import { setSessionUser } from "./sessionUser.js";
import privateLinkRoutes from "./routes/privateLinks.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let games = [];
const gamesFilePath = path.join(__dirname, "end.json");
try {
    const data = await fs.readFile(gamesFilePath, "utf8");
    games = JSON.parse(data);
} catch (err) {
    console.error("Failed to load games data:", err);
}

// Utility function to generate random strings
const generateRandomString = (length) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};

const extendAdfreeForDays = async (client, userId, days) => {
    const existing = await client.query(
        "SELECT expiration FROM adfree WHERE id = $1",
        [userId]
    );

    if (existing.rowCount > 0) {
        await client.query(
            "UPDATE adfree SET expiration = GREATEST(expiration, NOW()) + ($1 * INTERVAL '1 day') WHERE id = $2",
            [days, userId]
        );
        return;
    }

    await client.query(
        "INSERT INTO adfree (id, expiration) VALUES ($1, NOW() + ($2 * INTERVAL '1 day'))",
        [userId, days]
    );
};

const ADFREE_PLANS = {
    week: {
        price: 7,
        days: 7,
    },
    month: {
        price: 25,
        days: 30,
    },
    lifetime: {
        price: 100,
        days: 36500,
    },
};

const getCpxExpectedHash = (transId) => {
    const cpxSecureHash = process.env.CPX_SECURE_HASH;
    if (!cpxSecureHash || !transId) {
        return null;
    }

    return crypto
        .createHash("md5")
        .update(`${transId}-${cpxSecureHash}`)
        .digest("hex");
};

router.get('/ip', async (req, res) => {
    return res.send(requestIp.getClientIp(req));
})

router.get('/hit/:game', async (req, res) => {
    if(req.params.game === "bludclart" || req.params.game === "Blooket") {
        return res.status(403).send("Not Found");
    }
    const pipeline = redisClient.multi();
    pipeline.zAdd('game_leaderboard', { score: 1, value: req.params.game }, { INCR: true });

    pipeline.exec()
        .catch((err) => console.error("Redis update error:", err));

    return res.status(200).send("Updated");
})

router.post('/check', async (req, res) => {
    const { token } = req.body;

    try {
        const tokenResult = await pool.query(
            'SELECT id, token, admin, email FROM users WHERE token = $1',
            [token]
        );

        if (tokenResult.rowCount === 0) {
            return res.status(200).json({ loggedIn: false });
        }

        const user = tokenResult.rows[0];

        setSessionUser(req, user);

        // check adfree
        const adfreeResult = await pool.query(
            'SELECT expiration FROM adfree WHERE id = $1',
            [user.id]
        );

        let adfree = false;

        if (adfreeResult.rowCount > 0) {
            const expiration = new Date(adfreeResult.rows[0].expiration);

            if (expiration > new Date()) {
                adfree = true;
            } else {
                // cleanup expired entry
                await pool.query(
                    'DELETE FROM adfree WHERE id = $1',
                    [user.id]
                );
            }
        }

        res.status(200).json({
            loggedIn: true,
            adfree
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/arcade", async (req, res) => {
    try {
        // server makes request to frogiesarcade.win/makesesh
        const response = await fetch("https://frogiesarcade.win/makesesh");
        const data = await response.json();

        // return only the redir param
        res.json({ redir: data.redir });
    } catch (err) {
        console.error("Error fetching makesesh:", err);
        res.status(500).json({ error: "Failed to fetch makesesh" });
    }
});

// LOGIN Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await authenticateUserCredentials(email, password);

        if (!result.ok) {
            return res.send(result.reason);
        }

        setSessionUser(req, result.user);
        return res.send(result.user.token);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// REGISTER Route
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if email already exists
        const emailCheck = await pool.query('SELECT email FROM users WHERE email = $1', [email]);

        if (emailCheck.rowCount !== 0) {
            return res.send('exists'); // Account already exists
        }

        // Generate salt and token
        const salt = generateRandomString(64);
        const token = generateRandomString(32);
        const userId = Math.floor(Math.random() * (9000000000)) + 1000000000;

        // Hash the password with the salt
        const hashedPass = crypto.createHash('sha256').update(password + salt).digest('hex');

        // Insert new user into database
        await pool.query(
            'INSERT INTO users (email, token, salt, password, verified, data, id, admin) VALUES ($1, $2, $3, $4, false, $5, $6, false)',
            [email, token, salt, hashedPass, "{}", userId]
        );
        setSessionUser(req, { id: userId, token, admin: false, email });
        return res.send(token);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.get('/ad', async (req, res) => {
    return res.redirect("https://example.com");

    if (!req.session.token) {
        return res.redirect("//pl27932047.effectivegatecpm.com/57/d6/b3/57d6b3a41d7f9b2309969fdafcca2b6c.js");
    }

    const uid = await pool.query("SELECT id FROM users WHERE token = $1", [req.session.token]);
    if (uid.rowCount === 0) {
        return res.redirect("//pl27932047.effectivegatecpm.com/57/d6/b3/57d6b3a41d7f9b2309969fdafcca2b6c.js");
    }

    const result = await pool.query(
        "SELECT expiration FROM adfree WHERE id = $1",
        [uid.rows[0].id]
    );

    if (result.rowCount === 0) {
        return res.redirect("//pl27932047.effectivegatecpm.com/57/d6/b3/57d6b3a41d7f9b2309969fdafcca2b6c.js");
    }

    const expiration = new Date(result.rows[0].expiration);

    if (expiration > new Date()) {
        return res.redirect("https://example.com"); // adfree
    }

    // expired → remove row
    await pool.query(
        "DELETE FROM adfree WHERE id = $1",
        [uid.rows[0].id]
    );

    res.redirect("//pl27932047.effectivegatecpm.com/57/d6/b3/57d6b3a41d7f9b2309969fdafcca2b6c.js");
});

router.get('/postback', async (req, res) => {
    let replayKey = null;

    try {
        const {
            status,
            trans_id,
            user_id,
            amount_local,
            hash
        } = req.query;

        const transactionId = String(trans_id || "");
        const providedHash = String(hash || "").toLowerCase();
        const expectedHash = getCpxExpectedHash(transactionId);

        if (!expectedHash || !providedHash) {
            return res.status(403).send("forbidden");
        }

        const providedHashBuffer = Buffer.from(providedHash, "utf8");
        const expectedHashBuffer = Buffer.from(expectedHash, "utf8");

        if (
            providedHashBuffer.length !== expectedHashBuffer.length ||
            !crypto.timingSafeEqual(providedHashBuffer, expectedHashBuffer)
        ) {
            return res.status(403).send("forbidden");
        }

        replayKey = `myapp:cpx:postback:${transactionId}`;
        const replayResult = await redisClient.set(replayKey, "1", { NX: true, EX: 60 * 60 * 24 * 90 });

        if (!replayResult) {
            return res.send("OK");
        }

        if (!["1", "2"].includes(String(status))) {
            return res.send("invalid");
        }

        const credits = roundCredits(parseFloat(amount_local));
        if (!credits || !user_id || !transactionId) {
            return res.send("invalid");
        }

        const userResult = await pool.query(
            "SELECT data FROM users WHERE id = $1",
            [user_id]
        );

        if (userResult.rowCount === 0) {
            return res.send("invalid");
        }

        const currentBalance = getCreditBalance(userResult.rows[0].data);

        if (status === "1") {
            await pool.query(
                "UPDATE users SET data = $1 WHERE id = $2",
                [setCreditBalance(userResult.rows[0].data, currentBalance + credits), user_id]
            );
        }
        if (status === "2") {
            await pool.query(
                "UPDATE users SET data = $1 WHERE id = $2",
                [setCreditBalance(userResult.rows[0].data, currentBalance - credits), user_id]
            );
        }
        res.send("OK");
    } catch (err) {
        if (replayKey) {
            await redisClient.del(replayKey).catch(() => {});
        }
        console.error(err);
        res.status(500).send("error");
    }
});

router.post('/loadGameData', async (req, res) => {
    const { result: token } = req.body;

    try {
        const user = await pool.query('SELECT id FROM users WHERE token = $1', [token]);
        if (user.rowCount === 0) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        const userId = user.rows[0].id;
        const filePath = path.join(__dirname, 'private', 'data', `${userId}.json`);

        let data = '{}';
        try {
            data = await fs.readFile(filePath, 'utf-8');
        } catch (readErr) {
            // If file doesn't exist, return empty object
            if (readErr.code !== 'ENOENT') throw readErr;
        }

        res.json({ gameData: JSON.parse(data) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.post('/logout', async (req, res) => {
    const token = generateRandomString(32);

    // Update the user's token in the database
    try {
        await pool.query('UPDATE users SET token = $1 WHERE token = $2', [token, req.session.token]);
        req.session.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

router.post('/switch', async (req, res) => {
    const { site } = req.body;
    if (!["https://wqgqvswarit.swarit.104.36.84.31.nip.io/", "https://us4-ubg.github.io", "https://trigonometry.texasmath.net", "https://petezahgames.com", "https://securedweb.xyz", "https://flamepass.com", "https://watch.bludclart.com"].includes(site)) {
        return res.status(400).send("Invalid site");
    }
    req.session.siteOveride = site;
    req.session.siteOverride = site;
    res.redirect(site)
})

router.post('/store/adfree', async (req, res) => {
    const requestedPlan = String(req.body.plan || "");
    const plan = ADFREE_PLANS[requestedPlan];

    if (!req.session.token) {
        return res.status(401).json({ error: "Not logged in" });
    }

    if (!plan) {
        return res.status(400).json({ error: "Invalid plan" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const userResult = await client.query(
            "SELECT id, data FROM users WHERE token = $1 FOR UPDATE",
            [req.session.token]
        );

        if (userResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Account not found" });
        }

        const user = userResult.rows[0];
        const balance = getCreditBalance(user.data);

        if (balance < plan.price) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Not enough credits" });
        }

        await client.query(
            "UPDATE users SET data = $1 WHERE id = $2",
            [setCreditBalance(user.data, balance - plan.price), user.id]
        );

        await extendAdfreeForDays(client, user.id, plan.days);

        await client.query("COMMIT");

        return res.json({
            success: true,
            credits: roundCredits(balance - plan.price),
            plan: requestedPlan
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        return res.status(500).json({ error: "Store purchase failed" });
    } finally {
        client.release();
    }
});
router.use("/private-links", privateLinkRoutes);

// Save Game Data
router.post('/saveGameData', async (req, res) => {
    const { token, localStorageData } = req.body;

    try {
        const user = await pool.query('SELECT id FROM users WHERE token = $1', [token]);
        if (user.rowCount === 0) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        const userId = user.rows[0].id;
        const filePath = path.join(__dirname, 'private', 'data', `${userId}.json`);

        await fs.writeFile(filePath, JSON.stringify(localStorageData, null, 2), 'utf-8');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

router.get('/resolve/:id', async (req, res) => {
    const response = await fetch("https://cdn.jsdelivr.net/gh/gn-math/html@main/" + req.params.id);
    const content = await response.text();
    // Force proper rendering
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(content);
})

router.get('/img/:id', async (req, res) => {
    const gameName = req.params.id;
    const game = games.find((g) => g.name === gameName);

    try {
        if(game.prev) {
            res.sendFile(__dirname + "/static" + game.prev)
        } else {
            res.sendFile(__dirname + "/static/d/" + game.name.replace(/\//g, '') + '.jpg')
        }
    } catch (e) {
        res.status(500).json({ error: 'Server Error' });
    }
})

export default router;
