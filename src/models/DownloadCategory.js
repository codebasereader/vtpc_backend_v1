const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const downloadCategorySchema = new mongoose.Schema(
  {
    name: { type: bilingualSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

downloadCategorySchema.index({ order: 1 });
apiJson(downloadCategorySchema);

module.exports = mongoose.model("DownloadCategory", downloadCategorySchema);
