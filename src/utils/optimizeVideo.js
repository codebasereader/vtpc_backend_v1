const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const env = require("../config/env");

const inflight = new Set();
const queue = [];
let running = false;
let ffmpegMissingLogged = false;
let ffmpegBinCache;

function publicPathFromAbs(absPath) {
  const rel = path.relative(env.uploadsDir, absPath).split(path.sep).join("/");
  return `/uploads/${rel}`;
}

function resolveFfmpegBin() {
  if (ffmpegBinCache !== undefined) return ffmpegBinCache;
  const fromEnv = env.media.ffmpegPath;
  const candidates = [
    fromEnv,
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "/opt/local/bin/ffmpeg",
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      ffmpegBinCache = candidate;
      return ffmpegBinCache;
    }
  }
  ffmpegBinCache = "ffmpeg";
  return ffmpegBinCache;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(Object.assign(new Error("ffmpeg is not installed"), { code: "ENOENT" }));
      } else {
        reject(err);
      }
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });
}

function shouldSkipMp4(absPath) {
  if (path.extname(absPath).toLowerCase() !== ".mp4") return false;
  try {
    return fs.statSync(absPath).size <= env.media.videoSkipMp4MaxBytes;
  } catch {
    return false;
  }
}

async function convertVideoToMp4(absPath) {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath, path.extname(absPath));
  const tmpPath = path.join(dir, `${base}.converting.mp4`);
  const outputPath = path.join(dir, `${base}.mp4`);
  const scale = `scale='min(${env.media.videoMaxWidth},iw)':-2`;

  await runFfmpeg([
    "-y",
    "-i",
    absPath,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    String(env.media.videoCrf),
    "-vf",
    scale,
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    tmpPath,
  ]);

  if (path.resolve(outputPath) === path.resolve(absPath)) {
    const replacePath = path.join(dir, `${base}.optimized.mp4`);
    fs.renameSync(tmpPath, replacePath);
    fs.unlinkSync(absPath);
    fs.renameSync(replacePath, absPath);
    return absPath;
  }

  fs.renameSync(tmpPath, outputPath);
  if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  return outputPath;
}

async function setStatus(Model, docId, status) {
  if (!Model.schema.path("videoStatus")) return;
  await Model.updateOne({ _id: docId }, { $set: { videoStatus: status } });
}

async function runJob(job) {
  const { modelName, docId, field, sourcePath } = job;
  const Model = mongoose.models[modelName];
  if (!Model) {
    console.error(`video optimize: unknown model ${modelName}`);
    return;
  }

  if (!fs.existsSync(sourcePath)) {
    await setStatus(Model, docId, "failed");
    return;
  }

  try {
    const outputPath = await convertVideoToMp4(sourcePath);
    const newPublic = publicPathFromAbs(outputPath);
    const doc = await Model.findById(docId);
    if (!doc) {
      if (outputPath !== sourcePath && fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
      return;
    }
    const current = String(doc[field] || "");
    const stillThisFile =
      current.includes(path.basename(sourcePath)) || current.includes(path.basename(outputPath));
    if (!stillThisFile) {
      if (outputPath !== sourcePath && fs.existsSync(outputPath)) fs.unlink(outputPath, () => {});
      return;
    }
    doc.set(field, newPublic.replace(/\\/g, "/"));
    if (doc.schema.path("videoStatus")) doc.videoStatus = "ready";
    await doc.save();
  } catch (err) {
    if (err.code === "ENOENT" && !ffmpegMissingLogged) {
      ffmpegMissingLogged = true;
      console.error("video optimize: ffmpeg is not installed. Original video files will be kept.");
    } else {
      console.error("video optimize failed:", sourcePath, err.message);
    }
    await setStatus(Model, docId, "failed");
  }
}

function pump() {
  if (running) return;
  running = true;
  (async () => {
    while (queue.length) {
      const job = queue.shift();
      try {
        await runJob(job);
      } finally {
        inflight.delete(job.sourcePath);
      }
    }
    running = false;
  })().catch((err) => {
    running = false;
    console.error("video optimize queue error:", err);
  });
}

function scheduleVideoOptimization(Model, doc, field = "video") {
  const value = doc[field];
  if (!value || typeof value !== "string") return;

  const relative = value.replace(env.publicBaseUrl, "");
  if (!relative.startsWith("/uploads/")) return;
  const sourcePath = path.join(env.uploadsDir, relative.replace(/^\/uploads\/?/, ""));
  if (!sourcePath.startsWith(env.uploadsDir)) return;
  if (!fs.existsSync(sourcePath)) return;

  const ext = path.extname(sourcePath).toLowerCase();
  const isVideo = [".mp4", ".mov", ".webm", ".m4v", ".qt"].includes(ext);
  if (!isVideo) return;

  if (shouldSkipMp4(sourcePath)) {
    if (Model.schema.path("videoStatus")) doc.videoStatus = "ready";
    return;
  }

  if (inflight.has(sourcePath)) return;
  inflight.add(sourcePath);
  if (Model.schema.path("videoStatus")) doc.videoStatus = "processing";

  queue.push({
    modelName: Model.modelName,
    docId: doc._id,
    field,
    sourcePath,
  });
  pump();
}

function scheduleVideoJobs(Model, doc) {
  if (Model.schema.path("video")) {
    scheduleVideoOptimization(Model, doc, "video");
  }
}

module.exports = {
  scheduleVideoOptimization,
  scheduleVideoJobs,
  convertVideoToMp4,
  shouldSkipMp4,
  publicPathFromAbs,
};
