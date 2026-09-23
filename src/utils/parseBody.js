/**
 * CMS may send nested objects as JSON strings in multipart, or as
 * title[en] / title.en style fields. Normalize into plain objects.
 */
function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function setPath(target, pathParts, value) {
  let cursor = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

function parseRequestBody(raw = {}) {
  const body = {};

  for (const [key, value] of Object.entries(raw)) {
    const parsed = parseMaybeJson(value);
    if (key.includes("[") && key.endsWith("]")) {
      const parts = key.replace(/\]/g, "").split("[");
      setPath(body, parts.filter(Boolean), parsed);
    } else if (key.includes(".")) {
      setPath(body, key.split("."), parsed);
    } else {
      body[key] = parsed;
    }
  }

  return body;
}

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

module.exports = { parseRequestBody, pick, parseMaybeJson };
