const env = require("../config/env");
const { sessionCookieOptions } = require("../config/session");
const { AdminUser } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { authView } = require("../utils/access");
const { assertPassword } = require("../utils/password");
const { record, startSession, endSession, endOtherUserSessions } = require("../utils/audit");

const EMAIL_SHAPE = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
// Compared against when the email is unknown, so a wrong email and a wrong
// password take the same time and can't be told apart by timing.
const DUMMY_PASSWORD_HASH = "$2a$12$hOKqGe.U/LMkOEmTmcaXXeBxrC9wfr3PBMb5HGrevvNC4WiEhdV66";

const login = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    throw new HttpError(400, "Email and password are required");
  }

  const user = await AdminUser.findOne({ email }).populate("role");
  const passwordMatches = user
    ? await user.verifyPassword(password)
    : await AdminUser.verifyAgainst(DUMMY_PASSWORD_HASH, password);
  const ok = user && user.isActive && passwordMatches;
  if (!ok) {
    record(req, {
      action: "login_failed",
      sessionId: null,
      // Whatever was typed in the email box is logged, so anything that isn't
      // shaped like an email (e.g. a password typed in the wrong field) is masked.
      actor: { id: "", name: "", email: EMAIL_SHAPE.test(email) ? email : "[not an email]" },
      role: { id: "", name: "" },
      status: "failed",
      summary: `Failed login for ${EMAIL_SHAPE.test(email) ? email : "[not an email]"}`,
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

  // A fresh session id at login, so one planted before login can't be reused (session fixation).
  await new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
  req.session.userId = String(user._id);
  req.session.createdAt = Date.now();
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
  // Anyone else logged in with the old password is signed out; this session stays.
  await endOtherUserSessions(
    req.user._id,
    { keepSessionId: req.sessionID, keepAuditSessionId: req.session.auditSessionId },
    "password_change"
  );
  record(req, {
    action: "password_change",
    resource: "users",
    target: { id: String(req.user._id), label: req.user.email },
    summary: `Changed password for ${req.user.email}`,
  });
  res.json({ message: "Password updated" });
});

module.exports = { login, logout, me, changePassword };
