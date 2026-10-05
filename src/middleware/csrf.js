const env = require("../config/env");
const { HttpError } = require("../utils/errors");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

const allowedOrigins = new Set([...env.corsOrigins, env.publicBaseUrl].map(originOf).filter(Boolean));

/**
 * Cross-site request forgery guard for the cookie-authenticated routes.
 *
 * The session cookie is sent with any request the browser makes to this API,
 * including ones started by another website (a hidden form, for example).
 * Browsers always say where a state-changing request came from, so a write
 * whose Origin (or Referer) is not one of our own front-end origins is refused.
 * Requests with no browser origin information at all (curl, server-to-server)
 * carry no ambient browser cookie and are let through.
 */
function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin) {
    return allowedOrigins.has(origin) ? next() : next(new HttpError(403, "Cross-site request blocked", "CSRF_BLOCKED"));
  }

  const referer = req.headers.referer;
  if (referer) {
    return allowedOrigins.has(originOf(referer))
      ? next()
      : next(new HttpError(403, "Cross-site request blocked", "CSRF_BLOCKED"));
  }

  if (req.headers["sec-fetch-site"] === "cross-site") {
    return next(new HttpError(403, "Cross-site request blocked", "CSRF_BLOCKED"));
  }
  return next();
}

module.exports = { csrfGuard };
