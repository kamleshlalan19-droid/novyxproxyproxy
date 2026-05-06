import { getSessionUser } from "./sessionUser.js";

const DEFAULT_ADSERVER_BASE_URL = "http://127.0.0.1:3010";

function getAdserverBaseUrl(options = {}) {
  const baseUrl = options.adserverBaseUrl || process.env.ADSERVER_BASE_URL || DEFAULT_ADSERVER_BASE_URL;
  return String(baseUrl).replace(/\/$/, "");
}

async function getForwardedAccountId(req) {
  if (req.session?.user_id) {
    return req.session.user_id;
  }

  if (req.user?.id) {
    return req.user.id;
  }

  if (req.session?.token) {
    try {
      const user = await getSessionUser(req);
      return user?.id || null;
    } catch {
      return null;
    }
  }

  return null;
}

async function buildAdserverHeaders(req, options = {}) {
  const headers = {
    Accept: "application/json",
  };
  const internalAccessKey = options.internalAccessKey || process.env.ADSERVER_INTERNAL_ACCESS_KEY || "";
  const accountId = await getForwardedAccountId(req);
  const userAgent = req.get("user-agent") || "CanLite-Adserver-Proxy/1.0";
  const forwardedFor = req.ip || req.socket?.remoteAddress || req.get("x-forwarded-for") || "";
  const language = req.get("accept-language") || "";
  const dnt = req.get("dnt") || "";
  const usPrivacy = req.get("us-privacy") || "";

  headers["user-agent"] = userAgent;

  if (internalAccessKey) {
    headers["x-adserver-internal-key"] = internalAccessKey;
  }

  if (accountId) {
    headers["x-account-id"] = String(accountId);
  }

  if (forwardedFor) {
    headers["x-forwarded-for"] = String(forwardedFor);
  }

  if (language) {
    headers["accept-language"] = String(language);
  }

  if (dnt) {
    headers.dnt = String(dnt);
  }

  if (usPrivacy) {
    headers["us-privacy"] = String(usPrivacy);
  }

  return headers;
}

async function postToAdserver(req, apiPath, payload, options = {}) {
  const baseUrl = getAdserverBaseUrl(options);

  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      body: {
        error: "ADSERVER_BASE_URL is not configured.",
      },
    };
  }

  const headers = await buildAdserverHeaders(req, options);
  headers["content-type"] = "application/json";

  try {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
    });
    const rawText = await response.text();
    let body;

    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {
        error: rawText || "Unexpected adserver response.",
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      body: {
        error: "Failed to reach adserver.",
        detail: error.message,
      },
    };
  }
}

export {
  buildAdserverHeaders,
  getAdserverBaseUrl,
  getForwardedAccountId,
  postToAdserver,
};
