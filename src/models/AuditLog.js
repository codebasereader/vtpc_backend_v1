const mongoose = require("mongoose");

const actorSnapshot = {
  id: { type: String, default: "" },
  name: { type: String, default: "" },
  email: { type: String, default: "" },
};

const roleSnapshot = {
  id: { type: String, default: "" },
  name: { type: String, default: "" },
};

const ACTIONS = [
  "login",
  "login_failed",
  "logout",
  "session_expired",
  "create",
  "update",
  "delete",
  "status_change",
  "send",
  "permissions_change",
  "password_change",
  "password_reset",
  "access_denied",
];

const changeSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    from: { type: mongoose.Schema.Types.Mixed, default: null },
    to: { type: mongoose.Schema.Types.Mixed, default: null },
    truncated: { type: Boolean, default: false },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    sessionId: { type: String, default: null },
    actor: { type: actorSnapshot, default: () => ({}) },
    role: { type: roleSnapshot, default: () => ({}) },
    action: { type: String, required: true, enum: ACTIONS },
    resource: { type: String, default: null },
    target: {
      id: { type: String, default: null },
      label: { type: String, default: "" },
    },
    summary: { type: String, default: "" },
    changes: { type: [changeSchema], default: [] },
    status: { type: String, enum: ["success", "failed"], default: "success" },
    method: { type: String, default: "" },
    path: { type: String, default: "" },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: false }
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ "actor.id": 1, at: -1 });
auditLogSchema.index({ "role.id": 1, at: -1 });
auditLogSchema.index({ resource: 1, at: -1 });
auditLogSchema.index({ sessionId: 1, at: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.ACTIONS = ACTIONS;
