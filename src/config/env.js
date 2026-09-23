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

module.exports = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT) || 4000,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:4000").replace(/\/$/, ""),
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
