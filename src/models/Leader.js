const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const leaderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: bilingualSchema, default: () => ({}) },
    photo: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leaderSchema.index({ order: 1 });
apiJson(leaderSchema);

module.exports = mongoose.model("Leader", leaderSchema);
