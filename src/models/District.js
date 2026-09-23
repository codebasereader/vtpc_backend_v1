const mongoose = require("mongoose");
const { bilingualSchema, namedPctSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const districtSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: bilingualSchema, default: () => ({}) },
    totalExportValueCr: { type: Number, default: 0 },
    countries: { type: [namedPctSchema], default: [] },
    products: { type: [namedPctSchema], default: [] },
    sectors: { type: [namedPctSchema], default: [] },
  },
  { timestamps: true }
);

apiJson(districtSchema, { idFrom: "slug" });

module.exports = mongoose.model("District", districtSchema);
