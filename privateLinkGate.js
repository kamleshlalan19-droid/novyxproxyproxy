import { authenticateUserCredentials } from "./auth.js";
import { getPrivateLinkByDomain, userCanAccessPrivateLink } from "./privateLinks.js";
import { getSessionUser, setSessionUser } from "./sessionUser.js";

const renderPrivateLinkLogin = (res, privateLink, error = null, status = 200) => {
    return res.status(status).render("private-link-login", {
        domain: privateLink.domain,
        loginPath: privateLink.loginPath,
        error,
    });
};

export const createPrivateLinkRequestGate = ({ proxy }) => {
    return async (req, res, next) => {
        try {
            const privateLink = await getPrivateLinkByDomain(req.hostname);
            if (!privateLink) {
                return next();
            }

            const sessionUser = await getSessionUser(req);
            const hasAccess = sessionUser
                ? await userCanAccessPrivateLink(privateLink, sessionUser.id)
                : false;

            res.locals.privateLink = privateLink;

            if (hasAccess) {
                res.locals.privateLinkAccess = {
                    allowed: true,
                    role: Number(privateLink.ownerUserId) === Number(sessionUser.id) ? "owner" : "member",
                    user: sessionUser,
                };
                return next();
            }

            if (req.path === privateLink.loginPath) {
                if (req.method === "GET") {
                    return renderPrivateLinkLogin(res, privateLink);
                }

                if (req.method === "POST") {
                    const result = await authenticateUserCredentials(req.body.email, req.body.password);

                    if (!result.ok) {
                        return renderPrivateLinkLogin(
                            res,
                            privateLink,
                            result.reason === "acc" ? "No account found for that email." : "Incorrect password.",
                            401
                        );
                    }

                    const allowed = await userCanAccessPrivateLink(privateLink, result.user.id);
                    if (!allowed) {
                        return renderPrivateLinkLogin(
                            res,
                            privateLink,
                            "That account does not have access to this private link.",
                            403
                        );
                    }

                    setSessionUser(req, result.user);
                    return res.redirect("/");
                }
            }

            proxy.web(req, res, { target: privateLink.coverUrl, changeOrigin: true });
        } catch (error) {
            console.error("Private link routing error:", error);
            next(error);
        }
    };
};

export const canAccessPrivateLinkUpgrade = async (req) => {
    const hostHeader = req.headers.host;
    if (!hostHeader) {
        return null;
    }

    const privateLink = await getPrivateLinkByDomain(String(hostHeader).split(":")[0]);
    if (!privateLink) {
        return null;
    }

    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
        return false;
    }

    return userCanAccessPrivateLink(privateLink, sessionUser.id);
};
