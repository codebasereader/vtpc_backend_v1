const rateLimit = require("express-rate-limit");

const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});

const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
  keyGenerator: (req) => {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    return `${req.ip}|${email}`;
  },
  validate: { ip: false },
});

const visitTrackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

module.exports = { publicWriteLimiter, loginLimiter, loginEmailLimiter, visitTrackLimiter };
