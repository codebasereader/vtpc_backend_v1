const crypto = require("crypto");
const { HttpError } = require("./errors");

const QUESTION_TYPES = ["text", "textarea", "radio", "checkbox", "select", "rating"];
const INPUT_TYPES = ["text", "email", "tel", "number"];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^\+?[\d\s()-]{7,20}$/;
const QUESTION_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const MAX_QUESTIONS = 50;
const MAX_OPTIONS = 30;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_LABEL = 300;
const MAX_HELP = 500;
const MAX_TEXT = 300;
const MAX_TEXTAREA = 2000;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

const recentSubmissions = new Map();

function bilingual(value, { field, requiredEn = false, maxEn = 2000, maxKn = 2000 } = {}) {
  const en = String(value?.en ?? "").trim();
  const kn = String(value?.kn ?? "").trim();
  if (requiredEn && !en) {
    throw new HttpError(400, `${field} (English) is required`);
  }
  if (en.length > maxEn) {
    throw new HttpError(400, `${field} (English) must be ${maxEn} characters or fewer`);
  }
  if (kn.length > maxKn) {
    throw new HttpError(400, `${field} (Kannada) must be ${maxKn} characters or fewer`);
  }
  return { en, kn };
}

function parseSlug(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase();
  if (!slug || slug.length > 80 || !SLUG_RE.test(slug) || slug === "active" || slug === "responses") {
    throw new HttpError(
      400,
      "slug must be 1–80 characters of lowercase letters, numbers and hyphens"
    );
  }
  return slug;
}

function parseOptions(raw, questionLabel) {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new HttpError(400, `"${questionLabel}" needs at least 2 options`);
  }
  if (raw.length > MAX_OPTIONS) {
    throw new HttpError(400, `"${questionLabel}" can have at most ${MAX_OPTIONS} options`);
  }
  const seen = new Set();
  return raw.map((item, index) => {
    const label = bilingual(item?.label, {
      field: `Option ${index + 1} of "${questionLabel}"`,
      requiredEn: true,
      maxEn: MAX_LABEL,
      maxKn: MAX_LABEL,
    });
    const key = label.en.toLowerCase();
    if (seen.has(key)) {
      throw new HttpError(400, `Duplicate option "${label.en}" on "${questionLabel}"`);
    }
    seen.add(key);
    return { label };
  });
}

function parseQuestion(raw, index, usedIds) {
  const id = String(raw?.id || "").trim();
  if (!QUESTION_ID_RE.test(id)) {
    throw new HttpError(400, `Question ${index + 1} needs a stable id (letters, numbers, _ or -)`);
  }
  if (usedIds.has(id)) {
    throw new HttpError(400, `Duplicate question id "${id}"`);
  }
  usedIds.add(id);

  const type = String(raw?.type || "").trim();
  if (!QUESTION_TYPES.includes(type)) {
    throw new HttpError(400, `Question ${index + 1} has an invalid type`);
  }

  const label = bilingual(raw?.label, {
    field: `Question ${index + 1} label`,
    requiredEn: true,
    maxEn: MAX_LABEL,
    maxKn: MAX_LABEL,
  });
  const helpText = bilingual(raw?.helpText, {
    field: `Question ${index + 1} help text`,
    maxEn: MAX_HELP,
    maxKn: MAX_HELP,
  });
  const required = Boolean(raw?.required);

  const question = {
    id,
    type,
    label,
    helpText,
    required,
    options: [],
    inputType: "text",
  };

  if (type === "text") {
    const inputType = String(raw?.inputType || "text").trim() || "text";
    if (!INPUT_TYPES.includes(inputType)) {
      throw new HttpError(400, `"${label.en}" has an invalid input type`);
    }
    question.inputType = inputType;
  }

  if (type === "radio" || type === "checkbox" || type === "select") {
    question.options = parseOptions(raw?.options, label.en);
  }

  return question;
}

function parseFormPayload(body, { includeSlug = true } = {}) {
  const title = bilingual(body?.title, {
    field: "title",
    requiredEn: true,
    maxEn: MAX_TITLE,
    maxKn: MAX_TITLE,
  });
  const description = bilingual(body?.description, {
    field: "description",
    maxEn: MAX_DESCRIPTION,
    maxKn: MAX_DESCRIPTION,
  });
  const isActive = body?.isActive === undefined ? true : Boolean(body.isActive);

  if (!Array.isArray(body?.questions)) {
    throw new HttpError(400, "questions must be an array");
  }
  if (body.questions.length > MAX_QUESTIONS) {
    throw new HttpError(400, `A form can have at most ${MAX_QUESTIONS} questions`);
  }

  const usedIds = new Set();
  const questions = body.questions.map((q, i) => parseQuestion(q, i, usedIds));

  const payload = { title, description, isActive, questions };
  if (includeSlug) payload.slug = parseSlug(body?.slug);
  return payload;
}

function optionEnglishLabels(question) {
  return (question.options || []).map((opt) => String(opt.label?.en || "").trim()).filter(Boolean);
}

function isEmptyValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function asInteger(value) {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function validateAndSnapshotAnswers(form, rawAnswers) {
  if (!Array.isArray(rawAnswers)) {
    throw new HttpError(400, "answers must be an array");
  }
  if (rawAnswers.length > form.questions.length) {
    throw new HttpError(400, "Too many answers");
  }

  const byId = new Map(form.questions.map((q) => [q.id, q]));
  const seen = new Set();
  const answers = [];

  for (const item of rawAnswers) {
    const questionId = String(item?.questionId || "").trim();
    if (!questionId) {
      throw new HttpError(400, "Each answer needs a questionId");
    }
    if (seen.has(questionId)) {
      throw new HttpError(400, `Question "${questionId}" was answered more than once`);
    }
    seen.add(questionId);
    const question = byId.get(questionId);
    if (!question) {
      throw new HttpError(400, `Unknown question "${questionId}"`);
    }
    answers.push({
      questionId,
      question: question.label?.en || questionId,
      value: validateAnswerValue(question, item?.value),
    });
  }

  for (const question of form.questions) {
    if (!question.required) continue;
    if (!seen.has(question.id)) {
      throw new HttpError(400, `"${question.label?.en || question.id}" is required`);
    }
  }

  return answers;
}

function validateAnswerValue(question, value) {
  const label = question.label?.en || question.id;
  if (question.required && isEmptyValue(value)) {
    throw new HttpError(400, `"${label}" is required`);
  }

  if (question.type === "text") {
    if (typeof value !== "string") {
      throw new HttpError(400, `"${label}" must be text`);
    }
    const text = value.trim();
    if (text.length > MAX_TEXT) {
      throw new HttpError(400, `"${label}" must be ${MAX_TEXT} characters or fewer`);
    }
    if (question.inputType === "email" && !EMAIL_RE.test(text)) {
      throw new HttpError(400, `"${label}" must be a valid email`);
    }
    if (question.inputType === "tel" && !TEL_RE.test(text)) {
      throw new HttpError(400, `"${label}" must be a valid phone number`);
    }
    if (question.inputType === "number") {
      if (text === "" || Number.isNaN(Number(text))) {
        throw new HttpError(400, `"${label}" must be a number`);
      }
      return Number(text);
    }
    return text;
  }

  if (question.type === "textarea") {
    if (typeof value !== "string") {
      throw new HttpError(400, `"${label}" must be text`);
    }
    const text = value.trim();
    if (text.length > MAX_TEXTAREA) {
      throw new HttpError(400, `"${label}" must be ${MAX_TEXTAREA} characters or fewer`);
    }
    return text;
  }

  if (question.type === "radio" || question.type === "select") {
    if (typeof value !== "string") {
      throw new HttpError(400, `"${label}" must be one of the listed options`);
    }
    const choice = value.trim();
    if (!optionEnglishLabels(question).includes(choice)) {
      throw new HttpError(400, `"${choice}" is not a valid option for "${label}"`);
    }
    return choice;
  }

  if (question.type === "checkbox") {
    if (!Array.isArray(value) || value.length < 1) {
      throw new HttpError(400, `"${label}" needs at least one option`);
    }
    const allowed = new Set(optionEnglishLabels(question));
    const picked = [];
    const seen = new Set();
    for (const item of value) {
      if (typeof item !== "string") {
        throw new HttpError(400, `"${label}" options must be text`);
      }
      const choice = item.trim();
      if (!allowed.has(choice)) {
        throw new HttpError(400, `"${choice}" is not a valid option for "${label}"`);
      }
      const key = choice.toLowerCase();
      if (seen.has(key)) {
        throw new HttpError(400, `Duplicate option on "${label}"`);
      }
      seen.add(key);
      picked.push(choice);
    }
    return picked;
  }

  if (question.type === "rating") {
    const rating = asInteger(value);
    if (rating == null || rating < 1 || rating > 5) {
      throw new HttpError(400, `"${label}" must be a rating from 1 to 5`);
    }
    return rating;
  }

  throw new HttpError(400, `"${label}" has an unsupported type`);
}

function pruneRecentSubmissions(now) {
  for (const [key, seenAt] of recentSubmissions) {
    if (now - seenAt > DUPLICATE_WINDOW_MS) recentSubmissions.delete(key);
  }
}

function isDuplicateSubmission(ip, formId, answers) {
  const now = Date.now();
  pruneRecentSubmissions(now);
  const payload = JSON.stringify({ ip: ip || "", formId: String(formId), answers });
  const key = crypto.createHash("sha256").update(payload).digest("hex");
  if (recentSubmissions.has(key)) return true;
  recentSubmissions.set(key, now);
  return false;
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return forwarded || req.ip || "";
}

module.exports = {
  parseFormPayload,
  validateAndSnapshotAnswers,
  isDuplicateSubmission,
  clientIp,
};
