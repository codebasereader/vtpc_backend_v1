const env = require("../config/env");
const { sessionCookieOptions } = require("../config/session");
const { AdminUser } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { authView } = require("../utils/access");
const { assertPassword } = require("../utils/password");
const { record, startSession, endSession } = require("../utils/audit");

const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await AdminUser.findOne({ email }).populate("role");
  const ok = user && user.isActive && (await user.verifyPassword(password));
  if (!ok) {
    record(req, {
      action: "login_failed",
      sessionId: null,
      actor: { id: "", name: "", email },
      role: { id: "", name: "" },
      status: "failed",
      summary: `Failed login for ${email}`,
      changes: [
        {
          field: "reason",
          from: null,
          to: !user ? "unknown_email" : user.isActive ? "wrong_password" : "deactivated",
        },
      ],
    });
    throw new HttpError(401, "Invalid email or password");
  }

  user.lastLoginAt = new Date();
  await user.save();

  req.session.userId = String(user._id);
  req.user = user;
  await startSession(req, user);

  await new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });

  res.json(authView(user));
});

const logout = asyncHandler(async (req, res) => {
  const sessionId = req.session?.auditSessionId;
  if (sessionId) {
    await endSession(sessionId, "logout", { req });
  }
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
  res.json(authView(req.user));
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new HttpError(401, "Authentication required");
  }
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = assertPassword(req.body?.newPassword, "New password");
  const matches = await req.user.verifyPassword(currentPassword);
  if (!matches) {
    throw new HttpError(400, "Current password is incorrect");
  }
  req.user.passwordHash = await AdminUser.hashPassword(newPassword);
  req.user.mustChangePassword = false;
  await req.user.save();
  record(req, {
    action: "password_change",
    resource: "users",
    target: { id: String(req.user._id), label: req.user.email },
    summary: `Changed password for ${req.user.email}`,
  });
  res.json({ message: "Password updated" });
});

module.exports = { login, logout, me, changePassword };
