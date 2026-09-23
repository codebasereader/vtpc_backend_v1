const { HomepageContent } = require("../models");
const { asyncHandler } = require("../utils/errors");
const { parseRequestBody } = require("../utils/parseBody");
const { sendJson } = require("../utils/serialize");

const EMPTY = {
  hero: { title: "", subtitle: "" },
  highlights: [],
};

async function getOrCreate() {
  let doc = await HomepageContent.findOne();
  if (!doc) {
    doc = await HomepageContent.create(EMPTY);
  }
  return doc;
}

function toPublic(doc) {
  return {
    hero: {
      title: doc.hero?.title || "",
      subtitle: doc.hero?.subtitle || "",
    },
    highlights: (doc.highlights || []).map((h) => ({
      title: h.title || "",
      description: h.description || "",
    })),
  };
}

const get = asyncHandler(async (req, res) => {
  const doc = await getOrCreate();
  sendJson(res, toPublic(doc));
});

const update = asyncHandler(async (req, res) => {
  const body = parseRequestBody(req.body || {});
  const doc = await getOrCreate();
  doc.hero = {
    title: body.hero?.title || "",
    subtitle: body.hero?.subtitle || "",
  };
  doc.highlights = Array.isArray(body.highlights) ? body.highlights : [];
  await doc.save();
  sendJson(res, toPublic(doc));
});

module.exports = { get, update };
