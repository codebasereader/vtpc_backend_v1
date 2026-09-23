const { Enquiry } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");

const create = asyncHandler(async (req, res) => {
  const { productId, name, email, phone, message } = req.body || {};
  if (!productId || !name || !email || !message) {
    throw new HttpError(400, "productId, name, email and message are required");
  }

  await Enquiry.create({
    productId: String(productId).trim(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : "",
    message: String(message).trim(),
  });

  res.status(201).json({ message: "Enquiry received" });
});

const list = asyncHandler(async (req, res) => {
  const rows = await Enquiry.find().sort({ createdAt: -1 });
  res.json(rows.map((row) => row.toJSON()));
});

module.exports = { create, list };
