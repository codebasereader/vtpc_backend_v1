const { MarketRelease } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { parseRelease, toListItem } = require("../utils/marketRelease");
const { record } = require("../utils/audit");

function updatedByLabel(user) {
  if (!user) return "";
  const name = String(user.name || "").trim();
  const email = String(user.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

const listPublic = asyncHandler(async (req, res) => {
  const rows = await MarketRelease.find()
    .sort({ sortOrder: -1 })
    .select("key label type previousLabel counts updatedAt");
  res.json(rows.map(toListItem));
});

const getPublic = asyncHandler(async (req, res) => {
  const row = await MarketRelease.findOne({ key: String(req.params.key || "").toLowerCase() });
  if (!row) throw new HttpError(404, "Market release not found");
  // Who published it is for the admin audit log, not the public.
  const { updatedBy, ...publicRelease } = row.toJSON();
  res.json(publicRelease);
});

const upsert = asyncHandler(async (req, res) => {
  const doc = parseRelease(req.body, req.params.key);
  doc.updatedBy = updatedByLabel(req.user);
  const saved = await MarketRelease.findOneAndReplace({ key: doc.key }, doc, {
    upsert: true,
    new: true,
    runValidators: true,
  });
  record(req, {
    action: "update",
    resource: "marketData",
    target: { id: doc.key, label: doc.label },
    summary: `Published ${doc.label} (${doc.counts.districts} districts, ${doc.counts.sectors} sectors)`,
  });
  res.json(toListItem(saved));
});

const remove = asyncHandler(async (req, res) => {
  const key = String(req.params.key || "").toLowerCase();
  const row = await MarketRelease.findOne({ key });
  if (!row) throw new HttpError(404, "Market release not found");
  const label = row.label;
  const counts = row.counts || {};
  await row.deleteOne();
  record(req, {
    action: "delete",
    resource: "marketData",
    target: { id: key, label },
    summary: `Deleted ${label} (${counts.districts || 0} districts, ${counts.sectors || 0} sectors)`,
  });
  res.json({ message: "Market release deleted" });
});

module.exports = { listPublic, getPublic, upsert, remove };
