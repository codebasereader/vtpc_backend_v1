const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const downloadSchema = new mongoose.Schema(
  {
    title: { type: bilingualSchema, default: () => ({}) },
    category: {
      type: String,
      enum: ["Policy", "RTI", "Report", "Form"],
      required: true,
    },
    fileUrl: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

apiJson(downloadSchema);

module.exports = mongoose.model("Download", downloadSchema);
