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

module.exports = {
  nodeEnv,
  isProd,
  port,
  publicBaseUrl,
  corsOrigins,
  mongodbUri: required("MONGODB_URI"),
  sessionSecret: required("SESSION_SECRET"),
  cookieName: process.env.COOKIE_NAME || "vtpc.sid",
  cookieSameSite: (process.env.COOKIE_SAMESITE || "lax").toLowerCase(),
  sessionDays: Number(process.env.SESSION_DAYS) || 7,
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  admin: {
    email: process.env.ADMIN_EMAIL || "editor@vtpc.gov.in",
    password: process.env.ADMIN_PASSWORD || "change-this-password",
    name: process.env.ADMIN_NAME || "Editor",
  },
  uploadsDir: path.resolve(__dirname, "../../uploads"),
};
