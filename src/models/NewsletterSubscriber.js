const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

apiJson(newsletterSubscriberSchema);

module.exports = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);
