function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function bilingual(en = "", kn = "") {
  return { en: en || "", kn: kn || "" };
}

function isObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value));
}

module.exports = { toSlug, bilingual, isObjectId };
