import crypto from "crypto";
import { postToAdserver } from "./adserverClient.js";

const DEFAULT_PAGE_VISIT_EXCLUDE_PREFIXES = [
    "/api/",
    "/static/",
    "/dist/",
    "/uv/",
    "/~/uv/",
    "/b/",
];

export function getOrCreateVisitHash(req) {
    if (!req.session) {
        return crypto.randomUUID();
    }

    if (!req.session.adSignalVisitHash) {
        req.session.adSignalVisitHash = crypto.randomUUID();
    }

    return req.session.adSignalVisitHash;
}

export function attachVisitHash(req, res, next) {
    res.locals.visitHash = getOrCreateVisitHash(req);
    next();
}

export function buildAbsoluteRequestUrl(req) {
    return `${req.protocol}://${req.get("host")}${req.originalUrl || req.url}`;
}

export function shouldLogPageVisit(req) {
    if (req.method !== "GET") {
        return false;
    }

    const acceptHeader = String(req.get("accept") || "");
    if (!acceptHeader.includes("text/html")) {
        return false;
    }

    return !DEFAULT_PAGE_VISIT_EXCLUDE_PREFIXES.some((prefix) => req.path.startsWith(prefix));
}

export function createPageVisitLogger(options = {}) {
    return (req, res, next) => {
        const visitHash = res.locals.visitHash || getOrCreateVisitHash(req);
        res.locals.visitHash = visitHash;

        if (!shouldLogPageVisit(req)) {
            return next();
        }

        const pageUrl = buildAbsoluteRequestUrl(req);

        Promise.resolve()
            .then(() => postToAdserver(req, "/api/urls", {
                url: pageUrl,
                visitHash,
            }, options))
            .then((result) => {
                if (!result?.ok && result?.status !== 409) {
                    console.error("Failed to log page visit:", result?.body || result);
                }
            })
            .catch((error) => {
                console.error("Failed to log page visit:", error);
            });

        return next();
    };
}
