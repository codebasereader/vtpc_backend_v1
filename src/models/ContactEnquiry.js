const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const contactEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    contacted: { type: Boolean, default: false },
    contactedAt: { type: Date, default: null },
    contactedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

contactEnquirySchema.index({ createdAt: -1 });
contactEnquirySchema.index({ email: 1, createdAt: -1 });
apiJson(contactEnquirySchema, { keepTimestamps: true });

module.exports = mongoose.model("ContactEnquiry", contactEnquirySchema);
