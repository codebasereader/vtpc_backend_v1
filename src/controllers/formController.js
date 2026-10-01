const { Form, FormResponse } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const {
  parseFormPayload,
  validateAndSnapshotAnswers,
  isDuplicateSubmission,
  clientIp,
} = require("../utils/forms");
const { record, clonePlain, diffObjects, deleteChanges, targetFrom } = require("../utils/audit");

function toSummary(form, responseCount = 0) {
  const json = form.toJSON();
  return {
    id: json.id,
    slug: json.slug,
    title: json.title,
    description: json.description,
    isActive: Boolean(json.isActive),
    questionCount: Array.isArray(form.questions) ? form.questions.length : 0,
    responseCount,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

function toResponseJson(row) {
  const json = row.toJSON();
  return {
    id: json.id,
    createdAt: json.createdAt,
    answers: (json.answers || []).map((answer) => ({
      questionId: answer.questionId,
      question: answer.question,
      value: answer.value,
    })),
  };
}

async function responseCountsByForm(ids) {
  if (!ids.length) return new Map();
  const rows = await FormResponse.aggregate([
    { $match: { form: { $in: ids } } },
    { $group: { _id: "$form", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.n]));
}

async function findActiveBySlug(slug) {
  const form = await Form.findOne({ slug: String(slug || "").toLowerCase() });
  if (!form || !form.isActive) {
    throw new HttpError(404, "This form is not available");
  }
  return form;
}

const listActive = asyncHandler(async (req, res) => {
  const rows = await Form.find({ isActive: true }).sort({ createdAt: -1 }).select("slug title");
  res.json(
    rows.map((row) => {
      const json = row.toJSON();
      return { id: json.id, slug: json.slug, title: json.title };
    })
  );
});

const getPublic = asyncHandler(async (req, res) => {
  const form = await findActiveBySlug(req.params.slug);
  res.json(form.toJSON());
});

const submitResponse = asyncHandler(async (req, res) => {
  const form = await findActiveBySlug(req.params.slug);
  const answers = validateAndSnapshotAnswers(form, req.body?.answers);
  if (isDuplicateSubmission(clientIp(req), form._id, answers)) {
    return res.status(201).json({ message: "Response received" });
  }
  await FormResponse.create({ form: form._id, answers });
  res.status(201).json({ message: "Response received" });
});

const listAdmin = asyncHandler(async (req, res) => {
  const forms = await Form.find().sort({ createdAt: -1 });
  const counts = await responseCountsByForm(forms.map((row) => row._id));
  res.json(forms.map((form) => toSummary(form, counts.get(String(form._id)) || 0)));
});

const getAdmin = asyncHandler(async (req, res) => {
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  res.json(form.toJSON());
});

const create = asyncHandler(async (req, res) => {
  const payload = parseFormPayload(req.body, { includeSlug: true });
  const exists = await Form.exists({ slug: payload.slug });
  if (exists) {
    throw new HttpError(409, "slug already exists");
  }
  const form = await Form.create(payload);
  record(req, {
    action: "create",
    resource: "forms",
    target: targetFrom(form),
    summary: `Created form “${form.title?.en || form.slug}”`,
  });
  res.status(201).json(form.toJSON());
});

const replace = asyncHandler(async (req, res) => {
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  const before = clonePlain(form);
  const payload = parseFormPayload(req.body, { includeSlug: false });
  form.title = payload.title;
  form.description = payload.description;
  form.isActive = payload.isActive;
  form.questions = payload.questions;
  await form.save();
  record(req, {
    action: "update",
    resource: "forms",
    target: targetFrom(form),
    summary: `Updated form “${form.title?.en || form.slug}”`,
    changes: diffObjects(before, clonePlain(form)),
  });
  res.json(form.toJSON());
});

const patchActive = asyncHandler(async (req, res) => {
  if (typeof req.body?.isActive !== "boolean") {
    throw new HttpError(400, "isActive must be true or false");
  }
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  const wasActive = form.isActive;
  form.isActive = req.body.isActive;
  await form.save();
  record(req, {
    action: "status_change",
    resource: "forms",
    target: targetFrom(form),
    summary: `${form.isActive ? "Activated" : "Deactivated"} form “${form.title?.en || form.slug}”`,
    changes: [{ field: "isActive", from: wasActive, to: form.isActive }],
  });
  const responseCount = await FormResponse.countDocuments({ form: form._id });
  res.json(toSummary(form, responseCount));
});

const remove = asyncHandler(async (req, res) => {
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  const target = targetFrom(form);
  const snapshot = deleteChanges(form);
  await FormResponse.deleteMany({ form: form._id });
  await form.deleteOne();
  record(req, {
    action: "delete",
    resource: "forms",
    target,
    summary: `Deleted form “${target.label}”`,
    changes: snapshot,
  });
  res.json({ message: "Form deleted" });
});

const listResponses = asyncHandler(async (req, res) => {
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  const rows = await FormResponse.find({ form: form._id }).sort({ createdAt: -1 });
  res.json(rows.map(toResponseJson));
});

const removeResponse = asyncHandler(async (req, res) => {
  const form = await findByParamOrThrow(Form, req.params.id, "slug", "Form");
  const row = await FormResponse.findOne({ _id: req.params.responseId, form: form._id });
  if (!row) {
    throw new HttpError(404, "Response not found");
  }
  await row.deleteOne();
  record(req, {
    action: "delete",
    resource: "forms",
    target: { id: String(row._id), label: `Response on ${form.title?.en || form.slug}` },
    summary: `Deleted a response on “${form.title?.en || form.slug}”`,
  });
  res.json({ message: "Response deleted" });
});

module.exports = {
  listActive,
  getPublic,
  submitResponse,
  listAdmin,
  getAdmin,
  create,
  replace,
  patchActive,
  remove,
  listResponses,
  removeResponse,
};
