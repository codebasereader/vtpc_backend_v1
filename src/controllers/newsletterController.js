const { NewsletterSubscriber } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const subscribe = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new HttpError(400, "A valid email is required");
  }

  const existing = await NewsletterSubscriber.findOne({ email });
  if (existing) {
    return res.status(200).json({ email: existing.email });
  }

  const created = await NewsletterSubscriber.create({ email });
  return res.status(201).json({ email: created.email });
});

const list = asyncHandler(async (req, res) => {
  const rows = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  res.json(rows.map((row) => ({ email: row.email })));
});

const exportCsv = asyncHandler(async (req, res) => {
  const rows = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  const lines = ["email,subscribedAt"];
  for (const row of rows) {
    lines.push(`${csvEscape(row.email)},${csvEscape(row.createdAt.toISOString())}`);
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.csv");
  res.send(lines.join("\n"));
});

module.exports = { subscribe, list, exportCsv };
