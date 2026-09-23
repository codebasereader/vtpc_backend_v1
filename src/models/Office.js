const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const officeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    address: { type: bilingualSchema, default: () => ({}) },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    mapLink: { type: String, default: "" },
  },
  { timestamps: true }
);

apiJson(officeSchema);

module.exports = mongoose.model("Office", officeSchema);
