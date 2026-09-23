const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const enquirySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });
apiJson(enquirySchema, { keepTimestamps: true });

module.exports = mongoose.model("Enquiry", enquirySchema);
