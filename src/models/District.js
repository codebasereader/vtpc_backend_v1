const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

// Names only. District export figures come from the Market Data releases
// (see MarketRelease), not from anything stored on the district itself.
const districtSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

apiJson(districtSchema, { idFrom: "slug" });

module.exports = mongoose.model("District", districtSchema);
