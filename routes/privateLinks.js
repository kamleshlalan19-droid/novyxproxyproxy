import express from "express";
import { getAccountPrivateLink, getOwnedPrivateLinks, getPrivateLinkByDomain } from "../privateLinks.js";
import { getSessionUserSnapshot } from "../sessionUser.js";
import {
    addPrivateLinkMemberForOwner,
    contributeToPrivateLink,
    removePrivateLinkMemberForOwner,
    saveOwnedPrivateLink,
} from "../privateLinkService.js";

const router = express.Router();

const requireSessionUser = async (req, res) => {
    const user = getSessionUserSnapshot(req);
    if (!user) {
        res.status(401).json({ error: "Not logged in" });
        return null;
    }

    return user;
};

const requirePrivateLinkHost = async (req, res) => {
    const hostLink = await getPrivateLinkByDomain(req.hostname);
    if (!hostLink) {
        res.status(403).json({ error: "This action is only available on the private link itself" });
        return null;
    }

    return hostLink;
};

const sendCurrentPrivateLink = async (req, res, user, payload = {}) => {
    const [privateLink, privateLinks] = await Promise.all([
        getAccountPrivateLink({
            userId: user.id,
            hostname: req.hostname,
        }),
        getOwnedPrivateLinks(user.id),
    ]);

    return res.json({
        ...payload,
        privateLink,
        privateLinks,
    });
};

router.get("/account", async (req, res) => {
    const user = await requireSessionUser(req, res);
    if (!user) {
        return;
    }

    try {
        const [privateLink, privateLinks] = await Promise.all([
            getAccountPrivateLink({
                userId: user.id,
                hostname: req.hostname,
            }),
            getOwnedPrivateLinks(user.id),
        ]);

        res.json({ privateLink, privateLinks });
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

        return sendCurrentPrivateLink(req, res, user, {
            success: true,
            selectedLinkId: result.privateLink.id,
        });
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

    const hostLink = await requirePrivateLinkHost(req, res);
    if (!hostLink) {
        return;
    }

    try {
        const result = await addPrivateLinkMemberForOwner(user, hostLink.id, req.body.email);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        return sendCurrentPrivateLink(req, res, user, {
            success: true,
            selectedLinkId: hostLink.id,
        });
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

    const hostLink = await requirePrivateLinkHost(req, res);
    if (!hostLink) {
        return;
    }

    try {
        const result = await removePrivateLinkMemberForOwner(user.id, hostLink.id, req.params.userId);
        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        return sendCurrentPrivateLink(req, res, user, {
            success: true,
            selectedLinkId: hostLink.id,
        });
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

    const hostLink = await requirePrivateLinkHost(req, res);
    if (!hostLink) {
        return;
    }

    try {
        const result = await contributeToPrivateLink({
            user,
            hostname: req.hostname,
            linkId: hostLink.id,
            amount: req.body.amount,
        });

        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error });
        }

        return sendCurrentPrivateLink(req, res, user, {
            success: true,
            credits: result.credits,
            selectedLinkId: hostLink.id,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to contribute credits" });
    }
});

export default router;
