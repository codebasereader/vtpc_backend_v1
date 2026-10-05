const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
  "newsletters",
  "misc",
];

const NEWSLETTER_PDF_MAX_BYTES = 10 * 1024 * 1024;

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

// What each accepted file type must look like. The browser-sent MIME type and
// file name are only claims, so both the extension and the first bytes of the
// file are checked against this table.
const FILE_KINDS = {
  "image/jpeg": { exts: [".jpg", ".jpeg"], sig: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/jpg": { exts: [".jpg", ".jpeg"], sig: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { exts: [".png"], sig: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/gif": { exts: [".gif"], sig: (b) => b.subarray(0, 4).toString("latin1") === "GIF8" },
  "image/webp": {
    exts: [".webp"],
    sig: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
  "video/mp4": { exts: [".mp4", ".m4v"], sig: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" },
  "video/quicktime": { exts: [".mov"], sig: (b) => b.subarray(4, 8).toString("latin1") === "ftyp" },
  "video/webm": { exts: [".webm"], sig: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  "application/pdf": { exts: [".pdf"], sig: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  "application/msword": { exts: [".doc"], sig: (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) },
  "application/vnd.ms-excel": { exts: [".xls"], sig: (b) => b.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    exts: [".docx"],
    sig: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    exts: [".xlsx"],
    sig: (b) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
  },
};

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
  const base = (toSlug(path.basename(original || "file", ext)) || "file").slice(0, 60);
  // The random part makes stored files impossible to guess from the name.
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${base}${ext}`;
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
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!FILE_KINDS[mime]?.exts.includes(ext)) {
    return cb(new HttpError(400, `The file extension "${ext || "(none)"}" does not match its type (${mime})`));
  }
  cb(null, true);
}

const rawUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 80 * 1024 * 1024, files: 4 },
});

function removeFiles(files) {
  for (const file of files) {
    if (file?.path) fs.unlink(file.path, () => {});
  }
}

/** Rejects (and deletes) any uploaded file whose first bytes don't match its claimed type. */
function verifyUploadedFiles(req, res, next) {
  const files = collectFiles(req);
  try {
    for (const file of files) {
      const kind = FILE_KINDS[file.mimetype];
      const fd = fs.openSync(file.path, "r");
      const head = Buffer.alloc(16);
      fs.readSync(fd, head, 0, 16, 0);
      fs.closeSync(fd);
      if (!kind || !kind.sig(head)) {
        removeFiles(files);
        return next(new HttpError(400, `"${file.originalname}" is not a valid ${file.mimetype} file`));
      }
    }
  } catch (err) {
    removeFiles(files);
    return next(err);
  }
  next();
}

// Same call shape as multer (`upload.any()`, `upload.single("file")`), but every
// file is content-checked straight after it is stored.
const upload = {
  any: () => [rawUpload.any(), verifyUploadedFiles],
  single: (field) => [rawUpload.single(field), verifyUploadedFiles],
};

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

function absoluteDiskPath(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const relative = urlOrPath.replace(env.publicBaseUrl, "");
  if (!relative.startsWith("/uploads/")) return null;
  const abs = path.resolve(env.uploadsDir, relative.replace(/^\/uploads\/?/, ""));
  const root = path.resolve(env.uploadsDir);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

function deleteLocal(urlOrPath) {
  const abs = absoluteDiskPath(urlOrPath);
  if (!abs) return;
  fs.unlink(abs, () => {});
}

function originalFileName(file) {
  const name = path.basename(String(file?.originalname || "").replace(/\\/g, "/"));
  return name || "newsletter.pdf";
}

function assertNewsletterPdf(req, res, next) {
  const files = collectFiles(req);
  const unexpected = files.filter((file) => file.fieldname !== "attachment");
  if (unexpected.length) {
    for (const file of unexpected) fs.unlink(file.path, () => {});
    return next(new HttpError(400, "Only a PDF attachment is allowed"));
  }
  const file = files.find((item) => item.fieldname === "attachment");
  if (!file) return next();

  const mime = String(file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  const isPdf = mime === "application/pdf" || ext === ".pdf";
  if (!isPdf) {
    fs.unlink(file.path, () => {});
    return next(new HttpError(400, "Newsletter attachment must be a PDF"));
  }
  if (file.size > NEWSLETTER_PDF_MAX_BYTES) {
    fs.unlink(file.path, () => {});
    return next(new HttpError(400, "Newsletter PDF must be 10 MB or smaller"));
  }
  next();
}

module.exports = {
  FOLDERS,
  ALLOWED_FOLDERS,
  NEWSLETTER_PDF_MAX_BYTES,
  ensureUploadDirs,
  upload,
  setUploadFolder,
  setUploadFolders,
  optimizeUploadedImages,
  applyUploadedFiles,
  storedUrl,
  deleteLocal,
  absoluteDiskPath,
  collectFiles,
  originalFileName,
  assertNewsletterPdf,
  publicPathFor,
};
