// Small shared input checks for public and admin input.

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
const MAX_EMAIL_LENGTH = 254;

function isEmail(value) {
  const s = String(value || "");
  return s.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(s);
}

/** A link we are willing to store and later put in an href: http(s), or a same-site path. */
function isSafeLink(value) {
  const s = String(value || "").trim();
  if (!s) return true; // empty means "not set"
  if (s.startsWith("/")) return !s.startsWith("//") && !s.startsWith("/\\");
  try {
    const { protocol } = new URL(s);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

const safeLinkValidator = {
  validator: isSafeLink,
  message: "must be a web address starting with http:// or https://",
};

module.exports = { isEmail, isSafeLink, safeLinkValidator, MAX_EMAIL_LENGTH };
