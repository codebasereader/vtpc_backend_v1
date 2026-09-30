const { ContactEnquiry } = require("../models");
const env = require("../config/env");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { mailConfigured, sendHtmlMail } = require("../utils/mailer");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,20}$/;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

function contactedByLabel(user) {
  if (!user) return "";
  const name = String(user.name || "").trim();
  const email = String(user.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toContactEnquiryJson(row) {
  const json = typeof row.toJSON === "function" ? row.toJSON() : row;
  return {
    ...json,
    contacted: Boolean(json.contacted),
    contactedAt: json.contactedAt || null,
    contactedBy: json.contactedBy || "",
  };
}

function notifyAdmin(row) {
  const to = env.contactNotifyEmail;
  if (!to || !mailConfigured()) return;
  const phone = row.phone || "—";
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(row.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(row.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Enquiry:</strong></p>
    <p>${escapeHtml(row.message).replace(/\n/g, "<br>")}</p>
  `;
  sendHtmlMail({
    to,
    subject: `Contact enquiry from ${row.name}`,
    html,
  }).catch((err) => {
    console.error("contact enquiry notify failed:", err.message);
  });
}

const create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = String(req.body?.phone || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!name || !email || !message) {
    throw new HttpError(400, "name, email and message are required");
  }
  if (name.length > 120) {
    throw new HttpError(400, "name must be 120 characters or fewer");
  }
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, "A valid email is required");
  }
  if (phone && !PHONE_RE.test(phone)) {
    throw new HttpError(400, "phone must be 7–20 characters of digits, spaces, +, (, ) or -");
  }
  if (message.length > 2000) {
    throw new HttpError(400, "message must be 2000 characters or fewer");
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const duplicate = await ContactEnquiry.findOne({
    email,
    message,
    createdAt: { $gte: since },
  });
  if (duplicate) {
    return res.status(201).json({ message: "Enquiry received" });
  }

  const doc = await ContactEnquiry.create({
    name,
    email,
    phone,
    message,
  });
  notifyAdmin(doc);
  res.status(201).json({ message: "Enquiry received" });
});

const list = asyncHandler(async (req, res) => {
  const rows = await ContactEnquiry.find().sort({ createdAt: -1 });
  res.json(rows.map(toContactEnquiryJson));
});

const updateContacted = asyncHandler(async (req, res) => {
  if (typeof req.body?.contacted !== "boolean") {
    throw new HttpError(400, "contacted must be true or false");
  }
  const row = await findByParamOrThrow(ContactEnquiry, req.params.id, null, "Contact enquiry");
  row.contacted = req.body.contacted;
  if (req.body.contacted) {
    row.contactedAt = new Date();
    row.contactedBy = contactedByLabel(req.user);
  } else {
    row.contactedAt = null;
    row.contactedBy = "";
  }
  await row.save();
  res.json(toContactEnquiryJson(row));
});

module.exports = { create, list, updateContacted };
