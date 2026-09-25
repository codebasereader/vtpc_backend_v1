const { HttpError } = require("./errors");

function stripMeta(row) {
  const next = { ...row };
  delete next.id;
  delete next._id;
  delete next.__v;
  delete next.createdAt;
  delete next.updatedAt;
  return next;
}

async function replaceCollection(Model, rows, { label = Model.modelName } = {}) {
  if (!Array.isArray(rows)) {
    throw new HttpError(400, "Request body must be a JSON array");
  }

  const docs = rows.map(stripMeta);
  for (let i = 0; i < docs.length; i += 1) {
    const err = new Model(docs[i]).validateSync();
    if (err) {
      throw new HttpError(400, `${label} row ${i}: ${err.message}`);
    }
  }

  await Model.deleteMany({});
  if (docs.length) {
    await Model.insertMany(docs, { ordered: true });
  }
  return docs.length;
}

module.exports = { replaceCollection, stripMeta };
