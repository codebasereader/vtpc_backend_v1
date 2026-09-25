const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

function nullableNumber(value) {
  if (value === "" || value === undefined) return null;
  return value;
}

const warehouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    taluk: { type: String, default: "", trim: true },
    capacityMt: { type: Number, default: 0 },
    lat: { type: Number, default: null, set: nullableNumber },
    lng: { type: Number, default: null, set: nullableNumber },
    address: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

warehouseSchema.index({ district: 1, taluk: 1 });
apiJson(warehouseSchema);

module.exports = mongoose.model("Warehouse", warehouseSchema);
