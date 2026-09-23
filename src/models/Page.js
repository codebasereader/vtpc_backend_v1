const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: bilingualSchema, default: () => ({}) },
    body: { type: bilingualSchema, default: () => ({}) },
  },
  { timestamps: true }
);

apiJson(pageSchema);

module.exports = mongoose.model("Page", pageSchema);
