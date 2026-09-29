const nodemailer = require("nodemailer");
const env = require("../config/env");
const { HttpError } = require("./errors");

function mailConfigured() {
  return Boolean(env.smtp.host);
}

function createTransport() {
  if (!mailConfigured()) {
    throw new HttpError(503, "Email is not configured (set SMTP_HOST)");
  }
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

async function sendHtmlMail({ to, subject, html }) {
  const transport = createTransport();
  await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
  });
}

async function sendHtmlMailBatch(recipients, { subject, html }, batchSize = 25) {
  const transport = createTransport();
  let sent = 0;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const chunk = recipients.slice(i, i + batchSize);
    await Promise.all(
      chunk.map((to) =>
        transport.sendMail({
          from: env.smtp.from,
          to,
          subject,
          html,
        })
      )
    );
    sent += chunk.length;
  }
  return sent;
}

module.exports = { mailConfigured, sendHtmlMail, sendHtmlMailBatch };
