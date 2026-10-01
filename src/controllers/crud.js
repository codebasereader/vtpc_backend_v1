const { toSlug, isObjectId } = require("../utils/slug");
const { parseRequestBody } = require("../utils/parseBody");
const { sendJson, toApi } = require("../utils/serialize");
const { asyncHandler } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { applyUploadedFiles, deleteLocal } = require("../utils/upload");
const { scheduleVideoJobs } = require("../utils/optimizeVideo");
const { record, clonePlain, diffObjects, createChanges, deleteChanges, targetFrom } = require("../utils/audit");
const env = require("../config/env");

function mediaPath(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(env.publicBaseUrl, "");
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function applySlugFields(body, { slugField, slugFrom, generateIfMissing = true } = {}) {
  if (!slugField) {
    delete body.id;
    return body;
  }
  if (body.id && !body[slugField] && !isObjectId(body.id)) {
    body[slugField] = toSlug(body.id);
  }
  if (generateIfMissing && !body[slugField] && slugFrom) {
    const source = getPath(body, slugFrom);
    if (source) body[slugField] = toSlug(source);
  }
  if (body[slugField]) {
    body[slugField] = toSlug(body[slugField]);
  } else {
    delete body[slugField];
  }
  delete body.id;
  return body;
}

function makeCrud(Model, options = {}) {
  const {
    slugField = null,
    slugFrom = null,
    sort = null,
    label = "Record",
    fileFields = {},
    resource = null,
    resourceFrom = null,
  } = options;

  const fileKeys = Object.keys(fileFields);

  function resolveResource(doc) {
    return resourceFrom ? resourceFrom(doc) : resource;
  }

  function incoming(req, { generateSlug = true } = {}) {
    const body = parseRequestBody(req.body || {});
    applyUploadedFiles(req, body, fileFields);
    applySlugFields(body, { slugField, slugFrom, generateIfMissing: generateSlug });
    return body;
  }

  return {
    list: asyncHandler(async (req, res) => {
      const query = Model.find();
      if (sort) query.sort(sort);
      const docs = await query;
      sendJson(
        res,
        docs.map((d) => d.toJSON())
      );
    }),

    get: asyncHandler(async (req, res) => {
      const doc = await findByParamOrThrow(Model, req.params.id, slugField, label);
      sendJson(res, doc.toJSON());
    }),

    create: asyncHandler(async (req, res) => {
      const body = incoming(req, { generateSlug: true });
      const doc = await Model.create(body);
      scheduleVideoJobs(Model, doc);
      if (doc.isModified()) await doc.save();
      record(req, {
        action: "create",
        resource: resolveResource(doc),
        target: targetFrom(doc),
        summary: `Created ${label.toLowerCase()} “${targetFrom(doc).label}”`,
        changes: createChanges(doc),
      });
      sendJson(res, doc.toJSON(), 201);
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await findByParamOrThrow(Model, req.params.id, slugField, label);
      const before = clonePlain(doc);
      const previousVideo = doc.video;
      const body = incoming(req, { generateSlug: false });
      for (const key of fileKeys) {
        if (body[key] && body[key] !== doc[key]) {
          deleteLocal(doc[key]);
        }
      }
      Object.assign(doc, body);
      await doc.save();
      const uploadedNewVideo = Boolean(
        body.video && mediaPath(body.video) !== mediaPath(previousVideo)
      );
      if (uploadedNewVideo) {
        scheduleVideoJobs(Model, doc);
        if (doc.isModified()) await doc.save();
      }
      record(req, {
        action: "update",
        resource: resolveResource(doc),
        target: targetFrom(doc),
        summary: `Updated ${label.toLowerCase()} “${targetFrom(doc).label}”`,
        changes: diffObjects(before, clonePlain(doc)),
      });
      sendJson(res, doc.toJSON());
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await findByParamOrThrow(Model, req.params.id, slugField, label);
      const target = targetFrom(doc);
      const snapshot = deleteChanges(doc);
      for (const key of fileKeys) {
        if (doc[key]) deleteLocal(doc[key]);
      }
      await doc.deleteOne();
      record(req, {
        action: "delete",
        resource: resolveResource(doc),
        target,
        summary: `Deleted ${label.toLowerCase()} “${target.label}”`,
        changes: snapshot,
      });
      res.status(200).json({ message: `${label} deleted` });
    }),
  };
}

module.exports = { makeCrud, applySlugFields, toApi };
