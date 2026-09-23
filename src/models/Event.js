const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const eventSchema = new mongoose.Schema(
  {
    title: { type: bilingualSchema, default: () => ({}) },
    date: { type: String, required: true, trim: true },
    location: { type: bilingualSchema, default: () => ({}) },
    description: { type: bilingualSchema, default: () => ({}) },
    registrationLink: { type: String, default: "" },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1 });
apiJson(eventSchema);

module.exports = mongoose.model("Event", eventSchema);
