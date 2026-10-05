const mongoose = require("mongoose");

const auditSessionSchema = new mongoose.Schema(
  {
    actor: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    role: {
      id: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    loginAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    endedBy: {
      type: String,
      enum: ["logout", "expired", "deactivated", "password_reset", "password_change", null],
      default: null,
    },
    lastActivityAt: { type: Date, default: Date.now },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    changeCount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

auditSessionSchema.index({ loginAt: -1 });
auditSessionSchema.index({ "actor.id": 1, logoutAt: 1 });

module.exports = mongoose.model("AuditSession", auditSessionSchema);
