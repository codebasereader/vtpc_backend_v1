const { NewsletterSubscriber } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function subscriberStatus(row) {
  return row.status === "blocked" ? "blocked" : "active";
}

function toSubscriberJson(row) {
  return {
    id: String(row._id),
    email: row.email,
    status: subscriberStatus(row),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
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

  const created = await NewsletterSubscriber.create({ email, status: "active" });
  return res.status(201).json({ email: created.email });
});

const list = asyncHandler(async (req, res) => {
  const rows = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  res.json(rows.map(toSubscriberJson));
});

const updateStatus = asyncHandler(async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (status !== "active" && status !== "blocked") {
    throw new HttpError(400, "status must be active or blocked");
  }
  const row = await findByParamOrThrow(NewsletterSubscriber, req.params.id, null, "Subscriber");
  row.status = status;
  row.blockedAt = status === "blocked" ? new Date() : null;
  await row.save();
  res.json(toSubscriberJson(row));
});

const exportCsv = asyncHandler(async (req, res) => {
  const rows = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  const lines = ["email,status,subscribedAt"];
  for (const row of rows) {
    lines.push(
      `${csvEscape(row.email)},${csvEscape(subscriberStatus(row))},${csvEscape(row.createdAt.toISOString())}`
    );
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=newsletter-subscribers.csv");
  res.send(lines.join("\n"));
});

module.exports = { subscribe, list, updateStatus, exportCsv };
