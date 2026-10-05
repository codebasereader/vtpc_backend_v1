const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const figureSchema = new mongoose.Schema(
  {
    previous: { type: Number, default: null },
    current: { type: Number, default: null },
  },
  { _id: false }
);

const districtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    previous: { type: Number, default: null },
    current: { type: Number, required: true },
    variation: { type: Number, default: null },
    majorProducts: { type: String, default: "" },
  },
  { _id: false }
);

const sectorStateSchema = new mongoose.Schema(
  {
    sector: { type: String, required: true },
    isServices: { type: Boolean, default: false },
    values: { type: Map, of: figureSchema },
  },
  { _id: false }
);

const sectorDistrictSchema = new mongoose.Schema(
  {
    sector: { type: String, required: true },
    isServices: { type: Boolean, default: false },
    hsCode: { type: String, default: "" },
    total: { type: Number, default: null },
    values: { type: Map, of: Number },
  },
  { _id: false }
);

const countryDistrictSchema = new mongoose.Schema(
  {
    district: { type: String, required: true },
    country: { type: String, required: true },
    previous: { type: Number, default: null },
    current: { type: Number, required: true },
  },
  { _id: false }
);

const marketReleaseSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      match: /^(fy|q[1-4]-fy)-\d{4}-\d{2}$/,
    },
    type: { type: String, enum: ["quarter", "year"], required: true },
    label: { type: String, required: true, trim: true },
    previousLabel: { type: String, required: true, trim: true },
    sortOrder: { type: Number, required: true, index: true },
    unit: { type: String, default: "USD Mn" },
    source: { type: String, default: "DGCIS, Kolkata" },
    totals: { type: figureSchema, default: () => ({}) },
    districts: { type: [districtSchema], default: [] },
    states: { type: [String], default: [] },
    stateTotals: { type: Map, of: figureSchema },
    sectorStates: { type: [sectorStateSchema], default: [] },
    sectorDistricts: { type: [sectorDistrictSchema], default: [] },
    countryDistricts: { type: [countryDistrictSchema], default: [] },
    counts: {
      districts: { type: Number, default: 0 },
      sectors: { type: Number, default: 0 },
      states: { type: Number, default: 0 },
      countryRows: { type: Number, default: 0 },
    },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

apiJson(marketReleaseSchema, { keepTimestamps: true });

module.exports = mongoose.model("MarketRelease", marketReleaseSchema);
