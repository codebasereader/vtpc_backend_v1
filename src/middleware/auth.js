const { HttpError } = require("../utils/errors");
const { AdminUser } = require("../models");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next(new HttpError(401, "Authentication required"));
  }
  next();
}

async function attachUser(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      req.user = null;
      return next();
    }
    const user = await AdminUser.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Authentication required"));
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new HttpError(403, "Insufficient permissions"));
    }
    next();
  };
}

module.exports = { requireAuth, attachUser, requireRole };
