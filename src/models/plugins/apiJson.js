function apiJson(schema, { idFrom, keepTimestamps = false } = {}) {
  const transform = (_doc, ret) => {
    ret.id = idFrom ? ret[idFrom] : String(ret._id);
    if (idFrom && idFrom !== "id") delete ret[idFrom];
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
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
