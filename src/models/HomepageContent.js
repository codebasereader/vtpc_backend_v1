const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const highlightSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const homepageContentSchema = new mongoose.Schema(
  {
    hero: {
      title: { type: String, default: "" },
      subtitle: { type: String, default: "" },
    },
    highlights: { type: [highlightSchema], default: [] },
  },
  { timestamps: true }
);

apiJson(homepageContentSchema);

module.exports = mongoose.model("HomepageContent", homepageContentSchema);
