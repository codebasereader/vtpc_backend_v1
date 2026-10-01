const fs = require("fs");
const { NewsletterIssue, NewsletterSubscriber } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { sendJson } = require("../utils/serialize");
const { findByParamOrThrow } = require("../utils/lookup");
const { parseRequestBody } = require("../utils/parseBody");
const { mailConfigured, sendHtmlMailBatch } = require("../utils/mailer");
const { record, deleteChanges, targetFrom } = require("../utils/audit");
const {
  applyUploadedFiles,
  collectFiles,
  originalFileName,
  deleteLocal,
  absoluteDiskPath,
} = require("../utils/upload");

const ACTIVE_SUBSCRIBER_FILTER = { status: { $ne: "blocked" } };
const INLINE_SEND_LIMIT = 50;
const sendQueue = [];
let sendRunning = false;

function sentByLabel(user) {
  if (!user) return "";
  const name = String(user.name || "").trim();
  const email = String(user.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

function mailAttachmentsFor(issue) {
  if (!issue.attachment) return [];
  const abs = absoluteDiskPath(issue.attachment);
  if (!abs || !fs.existsSync(abs)) {
    throw new HttpError(400, "The attached PDF is missing from disk. Re-upload it before sending.");
  }
  return [
    {
      filename: issue.attachmentName || "newsletter.pdf",
      path: abs,
      contentType: "application/pdf",
    },
  ];
}

async function deliverIssue(issueId) {
  const issue = await NewsletterIssue.findById(issueId);
  if (!issue || issue.sentAt) return;
  const subscribers = await NewsletterSubscriber.find(ACTIVE_SUBSCRIBER_FILTER).select("email").lean();
  const emails = subscribers.map((row) => row.email).filter(Boolean);
  const recipientCount = await sendHtmlMailBatch(emails, {
    subject: issue.subject,
    html: issue.body,
    attachments: mailAttachmentsFor(issue),
  });
  issue.sentAt = new Date();
  issue.recipientCount = recipientCount;
  issue.status = "sent";
  await issue.save();
}

function pumpSendQueue() {
  if (sendRunning) return;
  sendRunning = true;
  (async () => {
    while (sendQueue.length) {
      const id = sendQueue.shift();
      try {
        await deliverIssue(id);
      } catch (err) {
        console.error("newsletter send failed:", id, err.message);
        await NewsletterIssue.updateOne(
          { _id: id, sentAt: null },
          { $set: { status: "failed" } }
        );
      }
    }
    sendRunning = false;
  })().catch((err) => {
    sendRunning = false;
    console.error("newsletter send queue error:", err);
  });
}

function scheduleIssueSend(issueId) {
  sendQueue.push(issueId);
  pumpSendQueue();
}

function listFilter(status) {
  if (status === "sent") return { sentAt: { $ne: null } };
  if (status === "sending") return { status: "sending", sentAt: null };
  if (status === "draft") {
    return {
      sentAt: null,
      status: { $nin: ["sending", "sent"] },
    };
  }
  return {};
}

const list = asyncHandler(async (req, res) => {
  const filter = listFilter(String(req.query.status || "").toLowerCase());
  const rows = await NewsletterIssue.find(filter).sort({ year: -1, month: -1, createdAt: -1 });
  sendJson(
    res,
    rows.map((row) => row.toJSON())
  );
});

const create = asyncHandler(async (req, res) => {
  const body = parseRequestBody(req.body || {});
  applyUploadedFiles(req, body, { attachment: "newsletters" });
  const uploaded = collectFiles(req).find((file) => file.fieldname === "attachment");
  let doc;
  try {
    doc = await NewsletterIssue.create({
      subject: body.subject,
      body: body.body,
      month: Number(body.month),
      year: Number(body.year),
      attachment: body.attachment || "",
      attachmentName: uploaded ? originalFileName(uploaded) : "",
      status: "draft",
    });
  } catch (err) {
    if (body.attachment) deleteLocal(body.attachment);
    throw err;
  }
  record(req, {
    action: "create",
    resource: "newsletterIssues",
    target: targetFrom(doc),
    summary: `Created newsletter “${doc.subject}”`,
  });
  sendJson(res, doc.toJSON(), 201);
});

const send = asyncHandler(async (req, res) => {
  const issue = await findByParamOrThrow(NewsletterIssue, req.params.id, null, "Newsletter issue");
  if (issue.sentAt || issue.status === "sent") {
    throw new HttpError(400, "This issue has already been sent");
  }
  if (issue.status === "sending") {
    throw new HttpError(409, "This issue is already sending");
  }
  if (!mailConfigured()) {
    throw new HttpError(503, "Email is not configured (set SMTP_HOST)");
  }
  mailAttachmentsFor(issue);

  const subscriberCount = await NewsletterSubscriber.countDocuments(ACTIVE_SUBSCRIBER_FILTER);
  issue.status = "sending";
  issue.sentBy = sentByLabel(req.user);
  await issue.save();

  if (subscriberCount <= INLINE_SEND_LIMIT) {
    try {
      await deliverIssue(issue._id);
    } catch (err) {
      issue.status = "failed";
      await issue.save();
      throw err;
    }
    const sent = await NewsletterIssue.findById(issue._id);
    record(req, {
      action: "send",
      resource: "newsletterIssues",
      target: targetFrom(sent),
      summary: `Sent newsletter “${sent.subject}” to ${sent.recipientCount || 0} recipient(s)`,
    });
    sendJson(res, sent.toJSON());
    return;
  }

  scheduleIssueSend(issue._id);
  record(req, {
    action: "send",
    resource: "newsletterIssues",
    target: targetFrom(issue),
    summary: `Queued newsletter “${issue.subject}” for ${subscriberCount} recipient(s)`,
  });
  sendJson(res, issue.toJSON());
});

const remove = asyncHandler(async (req, res) => {
  const issue = await findByParamOrThrow(NewsletterIssue, req.params.id, null, "Newsletter issue");
  if (issue.sentAt || issue.status === "sent") {
    throw new HttpError(400, "Sent issues cannot be deleted");
  }
  if (issue.status === "sending") {
    throw new HttpError(409, "This issue is currently sending and cannot be deleted");
  }
  if (issue.attachment) deleteLocal(issue.attachment);
  const target = targetFrom(issue);
  const snapshot = deleteChanges(issue);
  await issue.deleteOne();
  record(req, {
    action: "delete",
    resource: "newsletterIssues",
    target,
    summary: `Deleted newsletter “${target.label}”`,
    changes: snapshot,
  });
  res.json({ message: "Newsletter issue deleted" });
});

module.exports = { list, create, send, remove };
