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

// Keys that would reach Object.prototype (or a constructor) if used as a property name.
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function hasUnsafeKey(parts) {
  return parts.some((part) => UNSAFE_KEYS.has(part));
}

function setPath(target, pathParts, value) {
  let cursor = target;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    // Only follow properties the object really owns, never inherited ones.
    if (!Object.prototype.hasOwnProperty.call(cursor, key) || !cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

function parseRequestBody(raw = {}) {
  const body = {};

  for (const [key, value] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(key)) continue;
    const parsed = parseMaybeJson(value);
    if (key.includes("[") && key.endsWith("]")) {
      const parts = key.replace(/\]/g, "").split("[").filter(Boolean);
      if (hasUnsafeKey(parts)) continue;
      setPath(body, parts, parsed);
    } else if (key.includes(".")) {
      const parts = key.split(".");
      if (hasUnsafeKey(parts)) continue;
      setPath(body, parts, parsed);
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
