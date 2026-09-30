const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const statBoxSchema = new mongoose.Schema(
  {
    value: { type: String, required: true },
    label: { type: bilingualSchema, default: () => ({}) },
  },
  { _id: false }
);

const yearlyChartSchema = new mongoose.Schema(
  {
    year: { type: String, required: true },
    valueUsdMn: { type: Number, required: true },
  },
  { _id: false }
);

const topMarketSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const focusSectorSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: bilingualSchema, default: () => ({}) },
    icon: { type: String, default: "" },
    image: { type: String, default: "" },
    description: { type: bilingualSchema, default: () => ({}) },
    statBoxes: { type: [statBoxSchema], default: [] },
    yearlyChart: { type: [yearlyChartSchema], default: [] },
    topMarkets: { type: [topMarketSchema], default: [] },
    keyInsights: { type: bilingualSchema, default: () => ({}) },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

apiJson(focusSectorSchema, { idFrom: "slug" });
focusSectorSchema.index({ order: 1 });

module.exports = mongoose.model("FocusSector", focusSectorSchema);
