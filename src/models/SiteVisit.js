const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const siteVisitSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

apiJson(siteVisitSchema);

module.exports = mongoose.model("SiteVisit", siteVisitSchema);
