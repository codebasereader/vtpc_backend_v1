const { SiteVisit } = require("../models");
const { asyncHandler } = require("../utils/errors");

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const track = asyncHandler(async (req, res) => {
  const today = todayIst();
  await SiteVisit.updateOne({ date: today }, { $inc: { count: 1 } }, { upsert: true });
  res.status(204).end();
});

const summary = asyncHandler(async (req, res) => {
  const [agg] = await SiteVisit.aggregate([{ $group: { _id: null, total: { $sum: "$count" } } }]);
  res.json({ total: agg ? agg.total : 0 });
});

const daily = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = String(from);
    if (to) filter.date.$lte = String(to);
  }
  const rows = await SiteVisit.find(filter).sort({ date: 1 });
  res.json(rows.map((row) => ({ date: row.date, count: row.count })));
});

module.exports = { track, summary, daily };
