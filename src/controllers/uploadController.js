const env = require("../config/env");
const { asyncHandler, HttpError } = require("../utils/errors");
const { ALLOWED_FOLDERS, publicPathFor } = require("../utils/upload");
const { absoluteUrl } = require("../utils/serialize");

const create = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new HttpError(400, "file is required");
  }
  const folder = ALLOWED_FOLDERS.has(req.uploadFolder) ? req.uploadFolder : "misc";
  const path = publicPathFor(folder, file.filename);
  res.status(201).json({
    url: absoluteUrl(path),
    path,
    folder,
  });
});

const fromQueryFolder = (req, res, next) => {
  const folder = String(req.query.folder || req.body?.folder || "misc");
  req.uploadFolder = ALLOWED_FOLDERS.has(folder) ? folder : "misc";
  next();
};

module.exports = { create, fromQueryFolder, publicBaseUrl: env.publicBaseUrl };
