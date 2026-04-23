import { getUserByToken } from "./auth.js";

export const getSessionUser = async (req) => {
    return getUserByToken(req.session?.token);
};

export const setSessionUser = (req, user) => {
    req.session.token = user.token;
    req.session.admin = Boolean(user.admin);
    req.session.user_id = user.id;
};
