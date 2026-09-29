const path = require("path");
const { Download } = require("../models");
const env = require("../config/env");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");

function resolveLocalUpload(fileUrl) {
  if (!fileUrl) return null;
  const relative = String(fileUrl).replace(env.publicBaseUrl, "");
  if (!relative.startsWith("/uploads/")) return null;
  const uploadsRoot = path.resolve(env.uploadsDir);
  const abs = path.resolve(uploadsRoot, relative.replace(/^\/uploads\/?/, ""));
  if (!abs.startsWith(uploadsRoot + path.sep) && abs !== uploadsRoot) return null;
  return abs;
}

const sendAttachment = asyncHandler(async (req, res) => {
  const doc = await findByParamOrThrow(Download, req.params.id, null, "Download");
  const abs = resolveLocalUpload(doc.fileUrl);
  if (abs) {
    return res.download(abs, path.basename(abs));
  }
  if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl)) {
    return res.redirect(doc.fileUrl);
  }
  throw new HttpError(404, "File not found");
});

module.exports = { sendAttachment };
