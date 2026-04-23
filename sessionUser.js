import { getUserByToken } from "./auth.js";

export const getSessionUserSnapshot = (req) => {
    if (!req.session?.token || !req.session?.user_id) {
        return null;
    }

    return {
        id: req.session.user_id,
        token: req.session.token,
        admin: Boolean(req.session.admin),
        email: req.session.email || null,
    };
};

export const getSessionUser = async (req) => {
    const snapshot = getSessionUserSnapshot(req);
    if (!snapshot) {
        return null;
    }

    return getUserByToken(req.session?.token);
};

export const setSessionUser = (req, user) => {
    req.session.token = user.token;
    req.session.admin = Boolean(user.admin);
    req.session.user_id = user.id;
    req.session.email = user.email || null;
};
