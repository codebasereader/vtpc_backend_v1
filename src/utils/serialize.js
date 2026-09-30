const env = require("../config/env");

const FILE_FIELDS = ["photo", "image", "video", "fileUrl", "attachment"];

function absoluteUrl(value) {
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${env.publicBaseUrl}${path}`;
}

function withAbsoluteUrls(payload) {
  if (Array.isArray(payload)) {
    return payload.map(withAbsoluteUrls);
  }
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const next = { ...payload };
  for (const field of FILE_FIELDS) {
    if (next[field]) {
      next[field] = absoluteUrl(next[field]);
    }
  }
  return next;
}

function sendJson(res, data, status = 200) {
  return res.status(status).json(withAbsoluteUrls(data));
}

function toApi(doc) {
  if (!doc) return doc;
  return withAbsoluteUrls(typeof doc.toJSON === "function" ? doc.toJSON() : doc);
}

module.exports = { absoluteUrl, withAbsoluteUrls, sendJson, toApi, FILE_FIELDS };
