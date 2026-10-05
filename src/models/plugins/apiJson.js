function flattenMaps(value) {
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (value instanceof Map) {
    const obj = {};
    for (const [key, nested] of value.entries()) obj[key] = flattenMaps(nested);
    return obj;
  }
  if (Array.isArray(value)) return value.map(flattenMaps);
  const next = value;
  for (const key of Object.keys(next)) {
    next[key] = flattenMaps(next[key]);
  }
  return next;
}

function apiJson(schema, { idFrom, keepTimestamps = false } = {}) {
  const transform = (_doc, ret) => {
    ret.id = idFrom ? ret[idFrom] : String(ret._id);
    if (idFrom && idFrom !== "id") delete ret[idFrom];
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    flattenMaps(ret);
    if (!keepTimestamps) {
      delete ret.createdAt;
      delete ret.updatedAt;
    }
    return ret;
  };

  schema.set("toJSON", { virtuals: false, versionKey: false, transform });
  schema.set("toObject", { virtuals: false, versionKey: false, transform });
}

module.exports = { apiJson };
