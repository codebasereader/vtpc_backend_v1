const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const eventSchema = new mongoose.Schema(
  {
    title: { type: bilingualSchema, default: () => ({}) },
    type: { type: String, enum: ["domestic", "international"], required: true },
    city: { type: String, required: true, trim: true },
    sector: { type: String, required: true, trim: true },
    isDateTBA: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    tbaYear: { type: Number },
    description: { type: bilingualSchema, default: () => ({}) },
    registrationLink: { type: String, default: "" },
  },
  { timestamps: true }
);

eventSchema.index({ startDate: 1 });

eventSchema.pre("validate", function validateEventDates(next) {
  if (this.isDateTBA) {
    if (!this.tbaYear) {
      this.invalidate("tbaYear", "tbaYear is required when isDateTBA is true");
    }
  } else if (!this.startDate) {
    this.invalidate("startDate", "startDate is required unless isDateTBA is true");
  }
  next();
});

apiJson(eventSchema);

module.exports = mongoose.model("Event", eventSchema);
