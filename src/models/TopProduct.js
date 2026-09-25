const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const topProductSchema = new mongoose.Schema(
  {
    hsCode: { type: String, required: true, unique: true, trim: true },
    productName: { type: String, required: true, trim: true },
    color: { type: String, default: "" },
    exports: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

apiJson(topProductSchema);

module.exports = mongoose.model("TopProduct", topProductSchema);
