const env = require("../config/env");
const { sessionCookieOptions } = require("../config/session");
const { AdminUser } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");

const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await AdminUser.findOne({ email });
  const ok = user && (await user.verifyPassword(password));
  if (!ok) {
    throw new HttpError(401, "Invalid email or password");
  }

  req.session.userId = String(user._id);
  req.session.role = user.role;

  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  res.json(user.publicProfile());
});

const logout = asyncHandler(async (req, res) => {
  await new Promise((resolve) => {
    req.session.destroy(() => resolve());
  });
  res.clearCookie(env.cookieName, sessionCookieOptions());
  res.json({ message: "Logged out" });
});

const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }
  res.json(req.user.publicProfile());
});

module.exports = { login, logout, me };
