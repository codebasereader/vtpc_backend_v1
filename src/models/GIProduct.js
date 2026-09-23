const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const giProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: bilingualSchema, default: () => ({}) },
    category: { type: String, default: "" },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    summary: { type: bilingualSchema, default: () => ({}) },
    story: { type: bilingualSchema, default: () => ({}) },
  },
  { timestamps: true }
);

apiJson(giProductSchema, { idFrom: "slug" });

module.exports = mongoose.model("GIProduct", giProductSchema);
