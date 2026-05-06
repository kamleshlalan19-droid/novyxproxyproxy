import { CURRENT_CONSENT_VERSION } from "./consent.js";

export const getConsentAuditFields = (req) => ({
    consentVersion: CURRENT_CONSENT_VERSION,
    consentIp: req.ip || null,
    consentUserAgent: req.get("user-agent") || null,
});

export const applyUserConsent = async (client, userId, req) => {
    const audit = getConsentAuditFields(req);

    await client.query(
        `
            UPDATE users
            SET consent_version = $1,
                consented_at = NOW(),
                consent_ip = $2,
                consent_user_agent = $3
            WHERE id = $4
        `,
        [
            audit.consentVersion,
            audit.consentIp,
            audit.consentUserAgent,
            userId,
        ]
    );

    return audit;
};
