const { StateExport, TopProduct, CountryProduct } = require("../models");
const { asyncHandler } = require("../utils/errors");
const { sendJson } = require("../utils/serialize");
const { replaceCollection } = require("../utils/bulkReplace");

function listHandler(Model, sort) {
  return asyncHandler(async (req, res) => {
    const docs = await Model.find().sort(sort);
    sendJson(
      res,
      docs.map((d) => d.toJSON())
    );
  });
}

function bulkReplaceHandler(Model, label, resource) {
  return asyncHandler(async (req, res) => {
    const count = await replaceCollection(Model, req.body, { label });
    const { record } = require("../utils/audit");
    record(req, {
      action: "update",
      resource,
      target: { id: null, label },
      summary: `Replaced ${label.toLowerCase()} (${count} row(s))`,
    });
    res.status(200).json({ message: `${label} replaced`, count });
  });
}

module.exports = {
  listStateExports: listHandler(StateExport, { name: 1 }),
  replaceStateExports: bulkReplaceHandler(StateExport, "State exports", "marketIntelligence"),
  listTopProducts: listHandler(TopProduct, { productName: 1 }),
  replaceTopProducts: bulkReplaceHandler(TopProduct, "Top products", "marketIntelligence"),
  listCountryProducts: listHandler(CountryProduct, { country: 1, value: -1 }),
  replaceCountryProducts: bulkReplaceHandler(CountryProduct, "Country products", "marketIntelligence"),
};
