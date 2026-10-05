const { NewsletterSubscriber } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { record } = require("../utils/audit");

const { csvCell: csvEscape } = require("../utils/csv");
const { isEmail } = require("../utils/validate");

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
  if (!isEmail(email)) {
    throw new HttpError(400, "A valid email is required");
  }

  // Same answer whether or not the address was already subscribed, so this
  // form can't be used to find out who is on the list.
  const existing = await NewsletterSubscriber.findOne({ email });
  if (!existing) {
    await NewsletterSubscriber.create({ email, status: "active" });
  }
  return res.status(200).json({ email });
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
  const previous = row.status === "blocked" ? "blocked" : "active";
  row.status = status;
  row.blockedAt = status === "blocked" ? new Date() : null;
  await row.save();
  record(req, {
    action: "status_change",
    resource: "newsletterSubscribers",
    target: { id: String(row._id), label: row.email },
    summary: `${status === "blocked" ? "Blocked" : "Unblocked"} subscriber ${row.email}`,
    changes: [{ field: "status", from: previous, to: status }],
  });
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
