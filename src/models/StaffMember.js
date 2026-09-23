const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const staffMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    group: {
      type: String,
      enum: ["org-chart", "governing-council"],
      required: true,
    },
    order: { type: Number, default: 0 },
    photo: { type: String, default: "" },
  },
  { timestamps: true }
);

staffMemberSchema.index({ group: 1, order: 1 });
apiJson(staffMemberSchema);

module.exports = mongoose.model("StaffMember", staffMemberSchema);
