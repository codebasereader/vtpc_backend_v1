const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const talukSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

talukSchema.index({ district: 1 });
apiJson(talukSchema);

module.exports = mongoose.model("Taluk", talukSchema);
