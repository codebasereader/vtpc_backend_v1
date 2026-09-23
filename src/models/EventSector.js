const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const eventSectorSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: bilingualSchema, default: () => ({}) },
  },
  { timestamps: true }
);

apiJson(eventSectorSchema, { idFrom: "slug" });

module.exports = mongoose.model("EventSector", eventSectorSchema);
