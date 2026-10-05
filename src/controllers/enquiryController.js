const { Enquiry, GIProduct } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { record } = require("../utils/audit");
const { isEmail } = require("../utils/validate");

function contactedByLabel(user) {
  if (!user) return "";
  const name = String(user.name || "").trim();
  const email = String(user.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

function toEnquiryJson(row) {
  const json = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    ...json,
    contacted: Boolean(json.contacted),
    contactedAt: json.contactedAt || null,
    contactedBy: json.contactedBy || "",
    productName: json.productName || "",
  };
}

const create = asyncHandler(async (req, res) => {
  const { productId, name, email, phone, message } = req.body || {};
  if (!productId || !name || !email || !message) {
    throw new HttpError(400, "productId, name, email and message are required");
  }
  if (String(productId).length > 100) throw new HttpError(400, "Unknown GI product");
  if (String(name).trim().length > 120) throw new HttpError(400, "name must be 120 characters or fewer");
  if (!isEmail(String(email).trim().toLowerCase())) throw new HttpError(400, "A valid email is required");
  if (phone && !/^[0-9+\s()-]{7,20}$/.test(String(phone).trim())) {
    throw new HttpError(400, "phone must be 7–20 characters of digits, spaces, +, (, ) or -");
  }
  if (String(message).trim().length > 2000) throw new HttpError(400, "message must be 2000 characters or fewer");

  const slug = String(productId).trim().toLowerCase();
  const product = await GIProduct.findOne({ slug });
  if (!product) {
    throw new HttpError(400, "Unknown GI product");
  }

  await Enquiry.create({
    productId: slug,
    productName: String(product.name?.en || product.slug || slug).trim(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : "",
    message: String(message).trim(),
  });

  res.status(201).json({ message: "Enquiry received" });
});

const list = asyncHandler(async (req, res) => {
  const rows = await Enquiry.find().sort({ createdAt: -1 });
  res.json(rows.map(toEnquiryJson));
});

const updateContacted = asyncHandler(async (req, res) => {
  if (typeof req.body?.contacted !== "boolean") {
    throw new HttpError(400, "contacted must be true or false");
  }
  const row = await findByParamOrThrow(Enquiry, req.params.id, null, "Enquiry");
  row.contacted = req.body.contacted;
  if (req.body.contacted) {
    row.contactedAt = new Date();
    row.contactedBy = contactedByLabel(req.user);
  } else {
    row.contactedAt = null;
    row.contactedBy = "";
  }
  await row.save();
  record(req, {
    action: "status_change",
    resource: "giEnquiries",
    target: { id: String(row._id), label: row.email },
    summary: `${row.contacted ? "Marked" : "Unmarked"} GI enquiry from ${row.email} as contacted`,
    changes: [{ field: "contacted", from: !row.contacted, to: row.contacted }],
  });
  res.json(toEnquiryJson(row));
});

module.exports = { create, list, updateContacted };
