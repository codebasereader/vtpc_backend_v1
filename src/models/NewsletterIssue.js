const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const newsletterIssueSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    sentAt: { type: Date, default: null },
    recipientCount: { type: Number, default: null },
  },
  { timestamps: true }
);

newsletterIssueSchema.index({ year: -1, month: -1 });
apiJson(newsletterIssueSchema);

module.exports = mongoose.model("NewsletterIssue", newsletterIssueSchema);
