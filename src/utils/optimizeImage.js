const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const env = require("../config/env");

const CONVERT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

async function convertImageToWebp(filePath, mimetype) {
  if (!CONVERT_TYPES.has(mimetype)) return null;

  const inputStat = await fs.stat(filePath);
  const outputPath = filePath.replace(/\.[^.]+$/, ".webp");

  let pipeline = sharp(filePath).rotate();
  const meta = await pipeline.metadata();
  pipeline = sharp(filePath).rotate();
  if (meta.width && meta.width > env.media.imageMaxWidth) {
    pipeline = pipeline.resize({
      width: env.media.imageMaxWidth,
      withoutEnlargement: true,
    });
  }

  const buffer = await pipeline
    .webp({
      quality: env.media.imageWebpQuality,
      effort: env.media.imageWebpEffort,
      alphaQuality: 100,
    })
    .toBuffer();

  if (buffer.length >= inputStat.size) {
    return null;
  }

  await fs.writeFile(outputPath, buffer);
  await fs.unlink(filePath);
  return {
    path: outputPath,
    filename: path.basename(outputPath),
    mimetype: "image/webp",
  };
}

module.exports = { convertImageToWebp, CONVERT_TYPES };
