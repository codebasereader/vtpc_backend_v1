const { NewsletterIssue, NewsletterSubscriber } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { sendJson } = require("../utils/serialize");
const { findByParamOrThrow } = require("../utils/lookup");
const { parseRequestBody } = require("../utils/parseBody");
const { mailConfigured, sendHtmlMailBatch } = require("../utils/mailer");

const list = asyncHandler(async (req, res) => {
  const rows = await NewsletterIssue.find().sort({ year: -1, month: -1, createdAt: -1 });
  sendJson(
    res,
    rows.map((row) => row.toJSON())
  );
});

const create = asyncHandler(async (req, res) => {
  const body = parseRequestBody(req.body || {});
  const doc = await NewsletterIssue.create({
    subject: body.subject,
    body: body.body,
    month: body.month,
    year: body.year,
  });
  sendJson(res, doc.toJSON(), 201);
});

const send = asyncHandler(async (req, res) => {
  const issue = await findByParamOrThrow(NewsletterIssue, req.params.id, null, "Newsletter issue");
  if (issue.sentAt) {
    throw new HttpError(400, "This issue has already been sent");
  }
  if (!mailConfigured()) {
    throw new HttpError(503, "Email is not configured (set SMTP_HOST)");
  }

  const subscribers = await NewsletterSubscriber.find().select("email").lean();
  const emails = subscribers.map((row) => row.email).filter(Boolean);
  const recipientCount = await sendHtmlMailBatch(emails, {
    subject: issue.subject,
    html: issue.body,
  });

  issue.sentAt = new Date();
  issue.recipientCount = recipientCount;
  await issue.save();
  sendJson(res, issue.toJSON());
});

const remove = asyncHandler(async (req, res) => {
  const issue = await findByParamOrThrow(NewsletterIssue, req.params.id, null, "Newsletter issue");
  if (issue.sentAt) {
    throw new HttpError(400, "Sent issues cannot be deleted");
  }
  await issue.deleteOne();
  res.json({ message: "Newsletter issue deleted" });
});

module.exports = { list, create, send, remove };
