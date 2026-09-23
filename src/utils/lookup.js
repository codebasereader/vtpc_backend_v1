const { isObjectId } = require("./slug");
const { HttpError } = require("./errors");

async function findByParam(Model, param, slugField = null) {
  if (slugField) {
    const bySlug = await Model.findOne({ [slugField]: String(param).toLowerCase() });
    if (bySlug) return bySlug;
  }
  if (isObjectId(param)) {
    return Model.findById(param);
  }
  return null;
}

async function findByParamOrThrow(Model, param, slugField, label = "Record") {
  const doc = await findByParam(Model, param, slugField);
  if (!doc) throw new HttpError(404, `${label} not found`);
  return doc;
}

module.exports = { findByParam, findByParamOrThrow };
