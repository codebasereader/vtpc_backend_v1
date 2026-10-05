const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { apiJson } = require("./plugins/apiJson");

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminUserSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminUserSchema.statics.verifyAgainst = function verifyAgainst(hash, password) {
  return bcrypt.compare(password, hash);
};

adminUserSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

apiJson(adminUserSchema, { keepTimestamps: true });

module.exports = mongoose.model("AdminUser", adminUserSchema);
