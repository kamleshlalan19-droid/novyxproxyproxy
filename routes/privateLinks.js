import express from "express";
import { getAccountPrivateLink } from "../privateLinks.js";
import { getSessionUser } from "../sessionUser.js";
import {
    addPrivateLinkMemberForOwner,
    contributeToPrivateLink,
    removePrivateLinkMemberForOwner,
    saveOwnedPrivateLink,
} from "../privateLinkService.js";

const router = express.Router();

const requireSessionUser = async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) {
        res.status(401).json({ error: "Not logged in" });
        return null;
    }

    return user;
};

router.get("/account", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const privateLink = await getAccountPrivateLink({
            userId: user.id,
            hostname: req.hostname,
        });

        res.json({ privateLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to load private link" });
    }
});

router.post("/", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const result = await saveOwnedPrivateLink(user.id, req.body);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.json({ success: true, privateLink: result.privateLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save private link" });
    }
});

router.post("/members", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const result = await addPrivateLinkMemberForOwner(user, req.body.email);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.json({ success: true, privateLink: result.privateLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add member" });
    }
});

router.delete("/members/:userId", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const result = await removePrivateLinkMemberForOwner(user.id, req.params.userId);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.json({ success: true, privateLink: result.privateLink });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to remove member" });
    }
});

router.post("/contribute", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const result = await contributeToPrivateLink({
            user,
            hostname: req.hostname,
            amount: req.body.amount,
        });

        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        res.json({
            success: true,
            credits: result.credits,
            privateLink: result.privateLink,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to contribute credits" });
    }
});

export default router;
