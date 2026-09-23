const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { apiJson } = require("./plugins/apiJson");

const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["editor", "admin"], default: "editor" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

adminUserSchema.methods.verifyPassword = function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminUserSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

adminUserSchema.methods.publicProfile = function publicProfile() {
  return { id: String(this._id), name: this.name, role: this.role };
};

apiJson(adminUserSchema);

module.exports = mongoose.model("AdminUser", adminUserSchema);
