const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const stateExportSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    color: { type: String, default: "" },
    exports: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

apiJson(stateExportSchema);

module.exports = mongoose.model("StateExport", stateExportSchema);
