const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const citySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    state: { type: String, default: "", trim: true },
    country: { type: String, default: "India", trim: true },
  },
  { timestamps: true }
);

apiJson(citySchema, { idFrom: "slug" });

module.exports = mongoose.model("City", citySchema);
