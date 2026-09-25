const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const countryProductSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    hsCode: { type: String, default: "", trim: true },
    // Raw number from the source site (unit unlabeled there). Stored as-is.
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

countryProductSchema.index({ country: 1 });
apiJson(countryProductSchema);

module.exports = mongoose.model("CountryProduct", countryProductSchema);
