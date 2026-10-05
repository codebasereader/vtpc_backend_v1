const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

const corsOrigins = String(process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const port = Number(process.env.PORT) || 4000;
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(
  /\/$/,
  ""
);

try {
  const url = new URL(publicBaseUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const urlPort = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (isLocal && urlPort !== port) {
    console.warn(
      `PUBLIC_BASE_URL (${publicBaseUrl}) does not match PORT (${port}). ` +
        `Uploaded file URLs will 404. Set PUBLIC_BASE_URL=http://localhost:${port}`
    );
  }
} catch {
  // invalid URL is handled when a request tries to build a file link
}

// Refuse to run in production with the example session secret.
const sessionSecret = required("SESSION_SECRET");
const adminPassword = process.env.ADMIN_PASSWORD || "change-this-password";
if (isProd) {
  if (sessionSecret.length < 32 || /change-me/i.test(sessionSecret)) {
    throw new Error(
      "Unsafe production configuration: SESSION_SECRET must be a long random string (32+ characters), not the example value"
    );
  }
  if (!Number(process.env.TRUST_PROXY)) {
    console.warn(
      "TRUST_PROXY is 0. Behind nginx/a load balancer set TRUST_PROXY=1, otherwise every visitor shares one " +
        "IP address (rate limits and audit logs will be wrong)."
    );
  }
}

// ADMIN_PASSWORD is only used to create / reset the first admin account (create-admin, seed),
// not while the server is running — so it is checked there, not at startup.
function assertSafeAdminPassword() {
  if (isProd && (!process.env.ADMIN_PASSWORD || /^(change-this-password|admin@123|password)$/i.test(adminPassword))) {
    throw new Error("ADMIN_PASSWORD must be set to a strong password (not the example/default) before creating an admin in production");
  }
}

module.exports = {
  assertSafeAdminPassword,
  nodeEnv,
  isProd,
  port,
  publicBaseUrl,
  corsOrigins,
  mongodbUri: required("MONGODB_URI"),
  sessionSecret,
  cookieName: process.env.COOKIE_NAME || "vtpc.sid",
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  sessionDays: Number(process.env.SESSION_DAYS) || 7,
  // A login ends after this long without activity, and never lasts longer than the absolute limit.
  sessionIdleMs: (Number(process.env.SESSION_IDLE_MINUTES) || 120) * 60 * 1000,
  sessionAbsoluteMs: (Number(process.env.SESSION_ABSOLUTE_HOURS) || 12) * 60 * 60 * 1000,
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  admin: {
    email: process.env.ADMIN_EMAIL || "editor@vtpc.gov.in",
    password: adminPassword,
    name: process.env.ADMIN_NAME || "Editor",
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.ADMIN_EMAIL || "noreply@vtpc.gov.in",
  },
  contactNotifyEmail: process.env.CONTACT_NOTIFY_EMAIL || "",
  auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS) || 0,
  media: {
    imageMaxWidth: Number(process.env.IMAGE_MAX_WIDTH) || 1920,
    imageWebpQuality: Number(process.env.IMAGE_WEBP_QUALITY) || 82,
    imageWebpEffort: Number(process.env.IMAGE_WEBP_EFFORT) || 5,
    videoMaxWidth: Number(process.env.VIDEO_MAX_WIDTH) || 1280,
    videoCrf: Number(process.env.VIDEO_CRF) || 23,
    videoSkipMp4MaxBytes: 15 * 1024 * 1024,
    ffmpegPath: process.env.FFMPEG_PATH || "",
  },
  uploadsDir: path.resolve(__dirname, "../../uploads"),
};
