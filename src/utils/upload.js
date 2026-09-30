const fs = require("fs");
const path = require("path");
const multer = require("multer");
const env = require("../config/env");
const { toSlug } = require("./slug");
const { HttpError } = require("./errors");
const { convertImageToWebp } = require("./optimizeImage");

const FOLDERS = [
  "leaders",
  "staff",
  "gi-products",
  "gi-videos",
  "focus-sectors",
  "downloads",
  "misc",
];

const ALLOWED_FOLDERS = new Set(FOLDERS);

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const DOC_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function ensureUploadDirs() {
  for (const folder of FOLDERS) {
    fs.mkdirSync(path.join(env.uploadsDir, folder), { recursive: true });
  }
}

function publicPathFor(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

function diskPathFor(folder, filename) {
  return path.join(env.uploadsDir, folder, filename);
}

function uniqueName(original) {
  const ext = path.extname(original || "").toLowerCase();
  const base = toSlug(path.basename(original || "file", ext)) || "file";
  return `${Date.now()}-${base}${ext}`;
}

function folderFor(req, file) {
  const mapped =
    (req.uploadFolders && req.uploadFolders[file.fieldname]) || req.uploadFolder || "misc";
  return ALLOWED_FOLDERS.has(mapped) ? mapped : "misc";
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = folderFor(req, file);
    const dest = path.join(env.uploadsDir, folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, file, cb) {
    cb(null, uniqueName(file.originalname));
  },
});

function fileFilter(req, file, cb) {
  const mime = file.mimetype;
  const ok = IMAGE_TYPES.has(mime) || VIDEO_TYPES.has(mime) || DOC_TYPES.has(mime);
  if (!ok) {
    return cb(new HttpError(400, `Unsupported file type: ${mime}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 80 * 1024 * 1024, files: 4 },
});

function setUploadFolder(folder) {
  return (req, res, next) => {
    req.uploadFolder = ALLOWED_FOLDERS.has(folder) ? folder : "misc";
    next();
  };
}

function setUploadFolders(map) {
  return (req, res, next) => {
    req.uploadFolders = map;
    next();
  };
}

function collectFiles(req) {
  if (req.files) {
    return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  }
  return req.file ? [req.file] : [];
}

async function optimizeUploadedImages(req, res, next) {
  const files = collectFiles(req);
  for (const file of files) {
    if (!file?.mimetype || !file.mimetype.startsWith("image/")) continue;
    try {
      const converted = await convertImageToWebp(file.path, file.mimetype);
      if (converted) {
        file.path = converted.path;
        file.filename = converted.filename;
        file.mimetype = converted.mimetype;
      }
    } catch (err) {
      console.error("image optimize failed:", file.path, err.message);
    }
  }
  next();
}

function applyUploadedFiles(req, body, fieldMap = {}) {
  const files = collectFiles(req);
  for (const file of files) {
    let field = file.fieldname;
    if (field === "file") {
      if (fieldMap.fileUrl) field = "fileUrl";
      else if (fieldMap.photo) field = "photo";
      else if (fieldMap.image) field = "image";
    }
    if (!fieldMap[field]) continue;
    const url = publicPathFor(folderFor(req, file), file.filename);
    if (body[field]) deleteLocal(body[field]);
    body[field] = url;
  }
  return body;
}

function storedUrl(file, folder) {
  if (!file) return undefined;
  return publicPathFor(folder || reqFolder(file), file.filename);
}

function reqFolder(file) {
  const parent = path.basename(file.destination);
  return ALLOWED_FOLDERS.has(parent) ? parent : "misc";
}

function deleteLocal(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") return;
  const relative = urlOrPath.replace(env.publicBaseUrl, "");
  if (!relative.startsWith("/uploads/")) return;
  const abs = path.join(env.uploadsDir, relative.replace(/^\/uploads\/?/, ""));
  if (!abs.startsWith(env.uploadsDir)) return;
  fs.unlink(abs, () => {});
}

module.exports = {
  FOLDERS,
  ALLOWED_FOLDERS,
  ensureUploadDirs,
  upload,
  setUploadFolder,
  setUploadFolders,
  optimizeUploadedImages,
  applyUploadedFiles,
  storedUrl,
  deleteLocal,
  publicPathFor,
};
