const fs = require("fs");
const path = require("path");
const { connectDb } = require("../config/db");
const env = require("../config/env");
const { convertImageToWebp } = require("../utils/optimizeImage");
const { convertVideoToMp4, shouldSkipMp4 } = require("../utils/optimizeVideo");
const { Leader, StaffMember, GIProduct, FocusSector, Download } = require("../models");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".m4v"]);
const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const IMAGE_FIELDS = [
  [Leader, "photo"],
  [StaffMember, "photo"],
  [GIProduct, "image"],
  [FocusSector, "image"],
  [Download, "fileUrl"],
];

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, exts, out);
    else if (exts.has(path.extname(name).toLowerCase())) out.push(abs);
  }
  return out;
}

async function rewriteField(Model, field, oldName, newName) {
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await Model.find({ [field]: { $regex: escaped } });
  for (const doc of docs) {
    doc.set(field, String(doc[field]).replace(oldName, newName));
    await doc.save();
  }
  return docs.length;
}

async function convertImages() {
  const files = walk(env.uploadsDir, IMAGE_EXTS);
  let converted = 0;
  for (const abs of files) {
    const ext = path.extname(abs).toLowerCase();
    try {
      const result = await convertImageToWebp(abs, MIME[ext]);
      if (!result) continue;
      const oldName = path.basename(abs);
      const newName = result.filename;
      for (const [Model, field] of IMAGE_FIELDS) {
        await rewriteField(Model, field, oldName, newName);
      }
      converted += 1;
      console.log(`image ${oldName} -> ${newName}`);
    } catch (err) {
      console.error(`image skip ${abs}:`, err.message);
    }
  }
  return converted;
}

async function convertVideos() {
  const dir = path.join(env.uploadsDir, "gi-videos");
  const files = walk(dir, VIDEO_EXTS);
  let converted = 0;
  for (const abs of files) {
    if (shouldSkipMp4(abs)) continue;
    try {
      const oldName = path.basename(abs);
      const output = await convertVideoToMp4(abs);
      const newName = path.basename(output);
      if (oldName !== newName) {
        await rewriteField(GIProduct, "video", oldName, newName);
      }
      await GIProduct.updateMany(
        { video: { $regex: newName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } },
        { $set: { videoStatus: "ready" } }
      );
      converted += 1;
      console.log(`video ${oldName} -> ${newName}`);
    } catch (err) {
      console.error(`video skip ${abs}:`, err.message);
    }
  }
  return converted;
}

async function main() {
  await connectDb();
  const images = await convertImages();
  const videos = await convertVideos();
  console.log(`Done. Images converted: ${images}. Videos converted: ${videos}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
