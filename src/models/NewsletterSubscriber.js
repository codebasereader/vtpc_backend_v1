const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    blockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

apiJson(newsletterSubscriberSchema);

module.exports = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);
