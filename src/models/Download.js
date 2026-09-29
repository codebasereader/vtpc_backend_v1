const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const downloadSchema = new mongoose.Schema(
  {
    title: { type: bilingualSchema, default: () => ({}) },
    category: { type: String, required: true, trim: true },
    parent: {
      type: String,
      default: null,
      set(value) {
        if (value == null || value === "") return null;
        return String(value).trim();
      },
    },
    order: { type: Number, default: 0 },
    fileUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

downloadSchema.index({ category: 1, parent: 1, order: 1 });
apiJson(downloadSchema);

module.exports = mongoose.model("Download", downloadSchema);
