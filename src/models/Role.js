const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "", trim: true, maxlength: 300 },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

roleSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
apiJson(roleSchema, { keepTimestamps: true });

module.exports = mongoose.model("Role", roleSchema);
