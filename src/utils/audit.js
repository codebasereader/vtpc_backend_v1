const mongoose = require("mongoose");
const env = require("../config/env");
const { AuditLog, AuditSession } = require("../models");
const { actorSnapshot, roleSnapshot, recordLabel } = require("./access");

const REDACT_KEYS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "token",
  "secret",
  "session",
  "cookie",
]);
const SKIP_KEYS = new Set(["__v", "passwordHash", "updatedAt"]);
const MAX_VALUE_CHARS = 2000;
const MUTATING = new Set([
  "create",
  "update",
  "delete",
  "status_change",
  "send",
  "permissions_change",
]);

function clientIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req?.ip || "";
}

function userAgent(req) {
  return String(req?.headers?.["user-agent"] || "").slice(0, 400);
}

function redactKey(key) {
  const last = String(key || "").split(".").pop();
  return REDACT_KEYS.has(last);
}

function clonePlain(value) {
  if (value == null) return value;
  if (value.toObject) return JSON.parse(JSON.stringify(value.toObject({ depopulate: true })));
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function truncateValue(value) {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return { value, truncated: false };
  }
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (serialized.length <= MAX_VALUE_CHARS) {
    return { value, truncated: false };
  }
  return { value: `${serialized.slice(0, MAX_VALUE_CHARS)}…`, truncated: true };
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffObjects(before, after, prefix = "") {
  const changes = [];
  const left = before && typeof before === "object" && !Array.isArray(before) ? before : {};
  const right = after && typeof after === "object" && !Array.isArray(after) ? after : {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (SKIP_KEYS.has(key) || key === "_id") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (redactKey(key) || redactKey(path)) {
      if (!same(left[key], right[key])) {
        changes.push({ field: path, from: "[hidden]", to: "[hidden]", truncated: false });
      }
      continue;
    }
    const fromVal = left[key];
    const toVal = right[key];
    if (same(fromVal, toVal)) continue;
    if (
      fromVal &&
      toVal &&
      typeof fromVal === "object" &&
      typeof toVal === "object" &&
      !Array.isArray(fromVal) &&
      !Array.isArray(toVal) &&
      !(fromVal instanceof Date) &&
      !(toVal instanceof Date)
    ) {
      changes.push(...diffObjects(fromVal, toVal, path));
      continue;
    }
    const fromT = truncateValue(fromVal);
    const toT = truncateValue(toVal);
    changes.push({
      field: path,
      from: fromT.value,
      to: toT.value,
      truncated: fromT.truncated || toT.truncated,
    });
  }
  return changes;
}

function createChanges(after) {
  const plain = clonePlain(after) || {};
  const changes = [];
  for (const [field, raw] of Object.entries(plain)) {
    if (SKIP_KEYS.has(field) || field === "_id" || field === "id") continue;
    if (redactKey(field)) {
      changes.push({ field, from: null, to: "[hidden]", truncated: false });
      continue;
    }
    if (raw == null || raw === "" || (Array.isArray(raw) && !raw.length)) continue;
    const t = truncateValue(raw);
    changes.push({ field, from: null, to: t.value, truncated: t.truncated });
  }
  return changes.slice(0, 40);
}

function deleteChanges(before) {
  const plain = clonePlain(before) || {};
  const t = truncateValue(plain);
  return [{ field: "record", from: t.value, to: null, truncated: t.truncated }];
}

async function writeLog(req, payload) {
  const user = req?.user;
  const sessionId = payload.sessionId !== undefined ? payload.sessionId : req?.session?.auditSessionId || null;
  const doc = {
    at: new Date(),
    sessionId,
    actor: payload.actor || actorSnapshot(user),
    role: payload.role || roleSnapshot(user),
    action: payload.action,
    resource: payload.resource || null,
    target: {
      id: payload.target?.id != null ? String(payload.target.id) : null,
      label: payload.target?.label || "",
    },
    summary: payload.summary || "",
    changes: payload.changes || [],
    status: payload.status || "success",
    method: payload.method || req?.method || "",
    path: payload.path || req?.originalUrl || req?.path || "",
    ip: payload.ip || clientIp(req),
    userAgent: payload.userAgent || userAgent(req),
  };
  await AuditLog.create(doc);
  if (sessionId && MUTATING.has(payload.action) && doc.status === "success") {
    await AuditSession.updateOne({ _id: sessionId }, { $inc: { changeCount: 1 } });
  }
}

function record(req, payload) {
  Promise.resolve(writeLog(req, payload)).catch((err) => {
    console.error("audit write failed:", err.message);
  });
}

async function startSession(req, user) {
  const session = await AuditSession.create({
    actor: actorSnapshot(user),
    role: roleSnapshot(user),
    loginAt: new Date(),
    lastActivityAt: new Date(),
    ip: clientIp(req),
    userAgent: userAgent(req),
  });
  if (req.session) req.session.auditSessionId = String(session._id);
  record(req, {
    action: "login",
    sessionId: String(session._id),
    actor: actorSnapshot(user),
    role: roleSnapshot(user),
    summary: `Logged in as ${user.name} (${user.role?.name || "unknown role"})`,
  });
  return session;
}

async function endSession(sessionId, endedBy, extra = {}) {
  if (!sessionId) return;
  const session = await AuditSession.findById(sessionId);
  if (!session || session.logoutAt) return;
  session.logoutAt = extra.logoutAt || new Date();
  session.endedBy = endedBy;
  await session.save();
  if (endedBy === "logout" || endedBy === "expired") {
    record(
      extra.req || {},
      {
        action: endedBy === "logout" ? "logout" : "session_expired",
        sessionId: String(session._id),
        actor: session.actor,
        role: session.role,
        summary:
          endedBy === "logout"
            ? `Logged out ${session.actor.name}`
            : `Session expired for ${session.actor.name}`,
        ip: session.ip,
        userAgent: session.userAgent,
      }
    );
  }
}

async function endUserSessions(userId, endedBy) {
  const open = await AuditSession.find({ "actor.id": String(userId), logoutAt: null });
  for (const session of open) {
    session.logoutAt = new Date();
    session.endedBy = endedBy;
    await session.save();
    record(
      {},
      {
        action: "session_expired",
        sessionId: String(session._id),
        actor: session.actor,
        role: session.role,
        summary: `Session ended (${endedBy}) for ${session.actor.name}`,
        ip: session.ip,
        userAgent: session.userAgent,
      }
    );
  }
  await destroyExpressSessions(userId);
}

async function destroyExpressSessions(userId) {
  try {
    const col = mongoose.connection.collection("sessions");
    const ids = [];
    const cursor = col.find({});
    for await (const doc of cursor) {
      try {
        const data = typeof doc.session === "string" ? JSON.parse(doc.session) : doc.session;
        if (data && String(data.userId) === String(userId)) ids.push(doc._id);
      } catch {
        /* ignore corrupt session rows */
      }
    }
    if (ids.length) await col.deleteMany({ _id: { $in: ids } });
  } catch (err) {
    console.error("destroyExpressSessions failed:", err.message);
  }
}

async function touchSession(req) {
  const id = req.session?.auditSessionId;
  if (!id) return;
  const last = req.session.lastAuditActivityAt || 0;
  if (Date.now() - last < 60 * 1000) return;
  req.session.lastAuditActivityAt = Date.now();
  await AuditSession.updateOne(
    { _id: id, logoutAt: null },
    { $set: { lastActivityAt: new Date() } }
  );
}

async function expireStaleSessions() {
  const maxAgeMs = (env.sessionDays || 7) * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - maxAgeMs);
  const stale = await AuditSession.find({ logoutAt: null, lastActivityAt: { $lt: cutoff } });
  for (const session of stale) {
    await endSession(session._id, "expired", { logoutAt: session.lastActivityAt || session.loginAt });
  }
  const days = Number(env.auditRetentionDays || 0);
  if (days > 0) {
    const keepAfter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await AuditLog.deleteMany({ at: { $lt: keepAfter } });
  }
}

function targetFrom(doc) {
  const id = doc?._id || doc?.id;
  return { id: id ? String(id) : null, label: recordLabel(doc) };
}

module.exports = {
  record,
  startSession,
  endSession,
  endUserSessions,
  destroyExpressSessions,
  touchSession,
  expireStaleSessions,
  diffObjects,
  clonePlain,
  createChanges,
  deleteChanges,
  targetFrom,
  clientIp,
  userAgent,
};
