const { HttpError } = require("../utils/errors");
const { AdminUser } = require("../models");
const { isSuperAdmin, permissionList } = require("../utils/access");
const { record, endSession, touchSession } = require("../utils/audit");
const { staffPermissionForGroup } = require("../config/permissions");
const { findByParam } = require("../utils/lookup");
const { StaffMember } = require("../models");

function forbidden(req, next, resource) {
  record(req, {
    action: "access_denied",
    resource: resource || null,
    status: "failed",
    summary: `Access denied to ${req.method} ${req.originalUrl || req.path}`,
    target: { id: null, label: req.path },
  });
  next(new HttpError(403, "You do not have access to this section", "FORBIDDEN"));
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId || !req.user) {
    return next(new HttpError(401, "Authentication required"));
  }
  next();
}

async function attachUser(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      req.user = null;
      req.permissions = new Set();
      return next();
    }
    const user = await AdminUser.findById(req.session.userId).populate("role");
    if (!user || !user.isActive || !user.role) {
      const sessionId = req.session.auditSessionId;
      const endedBy = user && !user.isActive ? "deactivated" : "expired";
      req.session.destroy(() => {});
      req.user = null;
      req.permissions = new Set();
      if (sessionId) {
        endSession(sessionId, user && !user.isActive ? "deactivated" : "expired").catch(() => {});
      }
      if (req.path.startsWith("/admin") || req.path.startsWith("/auth")) {
        return next(new HttpError(401, "Authentication required"));
      }
      return next();
    }
    req.user = user;
    req.permissions = new Set(permissionList(user));
    req.isSuperAdmin = isSuperAdmin(user);
    if (req.session.auditSessionId) {
      touchSession(req).catch(() => {});
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requirePasswordChanged(req, res, next) {
  if (req.user?.mustChangePassword) {
    return next(
      new HttpError(403, "You must change your password before continuing", "PASSWORD_CHANGE_REQUIRED")
    );
  }
  next();
}

function hasPermission(req, key) {
  if (!req.user) return false;
  if (isSuperAdmin(req.user)) return true;
  return req.permissions?.has(key);
}

function requirePermission(key) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (hasPermission(req, key)) return next();
    return forbidden(req, next, key);
  };
}

function requireAnyPermission(...keys) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (isSuperAdmin(req.user) || keys.some((key) => req.permissions?.has(key))) return next();
    return forbidden(req, next, keys[0] || null);
  };
}

function requireAnyCatalogPermission(req, res, next) {
  if (!req.user) return next(new HttpError(401, "Authentication required"));
  if (isSuperAdmin(req.user) || (req.permissions && req.permissions.size > 0)) return next();
  return forbidden(req, next, "uploads");
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) return next(new HttpError(401, "Authentication required"));
  if (isSuperAdmin(req.user)) return next();
  return forbidden(req, next, null);
}

function requireStaffAccess(req, res, next) {
  (async () => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (isSuperAdmin(req.user)) return next();
    const needed = new Set();
    if (req.method === "POST") {
      needed.add(staffPermissionForGroup(req.body?.group));
    } else {
      const doc = await findByParam(StaffMember, req.params.id, null);
      if (doc) needed.add(staffPermissionForGroup(doc.group));
      if (req.body?.group) needed.add(staffPermissionForGroup(req.body.group));
    }
    for (const key of needed) {
      if (!key || !req.permissions.has(key)) {
        return forbidden(req, next, key || "orgChart");
      }
    }
    next();
  })().catch(next);
}

module.exports = {
  requireAuth,
  attachUser,
  requirePasswordChanged,
  requirePermission,
  requireAnyPermission,
  requireAnyCatalogPermission,
  requireSuperAdmin,
  requireStaffAccess,
  hasPermission,
};
