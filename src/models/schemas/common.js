const mongoose = require("mongoose");

const bilingualSchema = new mongoose.Schema(
  {
    en: { type: String, default: "" },
    kn: { type: String, default: "" },
  },
  { _id: false }
);

const namedPctSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

module.exports = { bilingualSchema, namedPctSchema };
