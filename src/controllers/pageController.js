const { Page } = require("../models");
const { makeCrud } = require("./crud");
const { asyncHandler, HttpError } = require("../utils/errors");
const { sendJson } = require("../utils/serialize");

const admin = makeCrud(Page, { label: "Page", resource: "pages", slugField: "slug", slugFrom: "title.en" });

const getBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const page = await Page.findOne({ slug });
  if (!page) throw new HttpError(404, "Page not found");
  sendJson(res, page.toJSON());
});

module.exports = {
  getBySlug,
  list: admin.list,
  create: admin.create,
  update: admin.update,
  remove: admin.remove,
};
