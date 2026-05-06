export const CURRENT_CONSENT_VERSION = "2026-05-05-signal-collection-v1";

export const hasAcceptedCurrentConsent = (user) => (
    Boolean(user?.consent_version)
    && String(user.consent_version) === CURRENT_CONSENT_VERSION
    && Boolean(user?.consented_at)
);

export const isHtmlNavigationRequest = (req) => (
    req.method === "GET"
    && req.accepts(["html", "json"]) === "html"
);

export const isConsentExemptPath = (requestPath) => (
    requestPath === "/consent"
    || requestPath === "/privacy"
    || requestPath === "/terms"
    || requestPath.startsWith("/api/")
    || requestPath.startsWith("/static/")
    || requestPath.startsWith("/dist/")
    || requestPath.startsWith("/uv/")
    || requestPath.startsWith("/~/uv/")
    || requestPath.startsWith("/b/")
    || requestPath === "/favicon.ico"
);

export const normalizeReturnTo = (value) => {
    const fallback = "/";
    const raw = String(value || "").trim();

    if (!raw.startsWith("/") || raw.startsWith("//")) {
        return fallback;
    }

    return raw;
};
