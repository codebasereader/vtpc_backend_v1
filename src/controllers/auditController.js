const { AuditLog, AuditSession } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { isObjectId } = require("../utils/slug");

function paging(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  return { page, limit, skip: (page - 1) * limit };
}

function dateRange(query) {
  const filter = {};
  if (query.from) {
    const from = new Date(query.from);
    if (!Number.isNaN(from.getTime())) filter.$gte = from;
  }
  if (query.to) {
    const to = new Date(query.to);
    if (!Number.isNaN(to.getTime())) {
      if (query.to.length <= 10) to.setUTCHours(23, 59, 59, 999);
      filter.$lte = to;
    }
  }
  return Object.keys(filter).length ? filter : null;
}

function logFilter(query) {
  const filter = {};
  const at = dateRange(query);
  if (at) filter.at = at;
  if (query.userId) filter["actor.id"] = String(query.userId);
  if (query.roleId) filter["role.id"] = String(query.roleId);
  if (query.action) filter.action = String(query.action);
  if (query.resource) filter.resource = String(query.resource);
  if (query.sessionId) filter.sessionId = String(query.sessionId);
  const q = String(query.q || "").trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ "actor.name": rx }, { "actor.email": rx }, { summary: rx }, { "target.label": rx }];
  }
  return filter;
}

function sessionJson(row) {
  return {
    id: String(row._id),
    actor: row.actor,
    role: row.role,
    loginAt: row.loginAt,
    logoutAt: row.logoutAt,
    endedBy: row.endedBy,
    lastActivityAt: row.lastActivityAt,
    ip: row.ip,
    userAgent: row.userAgent,
    changeCount: row.changeCount || 0,
  };
}

function logJson(row) {
  return {
    id: String(row._id),
    at: row.at,
    sessionId: row.sessionId,
    actor: row.actor,
    role: row.role,
    action: row.action,
    resource: row.resource,
    target: row.target,
    summary: row.summary,
    changes: row.changes || [],
    status: row.status,
    method: row.method,
    path: row.path,
    ip: row.ip,
    userAgent: row.userAgent,
  };
}

const { csvCell: csvEscape } = require("../utils/csv");

const listLogs = asyncHandler(async (req, res) => {
  const { skip, limit } = paging(req.query);
  const filter = logFilter(req.query);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items: items.map(logJson), total });
});

const getLog = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(404, "Audit log not found");
  const row = await AuditLog.findById(req.params.id);
  if (!row) throw new HttpError(404, "Audit log not found");
  res.json(logJson(row));
});

const exportLogs = asyncHandler(async (req, res) => {
  const filter = logFilter(req.query);
  const items = await AuditLog.find(filter).sort({ at: -1 }).limit(5000);
  const lines = ["at,actor name,actor email,role,action,resource,target,summary,ip"];
  for (const row of items) {
    lines.push(
      [
        row.at?.toISOString?.() || "",
        csvEscape(row.actor?.name),
        csvEscape(row.actor?.email),
        csvEscape(row.role?.name),
        csvEscape(row.action),
        csvEscape(row.resource),
        csvEscape(row.target?.label),
        csvEscape(row.summary),
        csvEscape(row.ip),
      ].join(",")
    );
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
  res.send(`\uFEFF${lines.join("\n")}`);
});

const listSessions = asyncHandler(async (req, res) => {
  const { skip, limit } = paging(req.query);
  const filter = {};
  const loginAt = dateRange(req.query);
  if (loginAt) filter.loginAt = loginAt;
  if (req.query.userId) filter["actor.id"] = String(req.query.userId);
  if (req.query.roleId) filter["role.id"] = String(req.query.roleId);
  if (req.query.active === "true") filter.logoutAt = null;
  if (req.query.active === "false") filter.logoutAt = { $ne: null };
  const [items, total] = await Promise.all([
    AuditSession.find(filter).sort({ loginAt: -1 }).skip(skip).limit(limit),
    AuditSession.countDocuments(filter),
  ]);
  res.json({ items: items.map(sessionJson), total });
});

const getSession = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new HttpError(404, "Session not found");
  const session = await AuditSession.findById(req.params.id);
  if (!session) throw new HttpError(404, "Session not found");
  const events = await AuditLog.find({ sessionId: String(session._id) }).sort({ at: 1 });
  res.json({ session: sessionJson(session), events: events.map(logJson) });
});

module.exports = { listLogs, getLog, exportLogs, listSessions, getSession };
