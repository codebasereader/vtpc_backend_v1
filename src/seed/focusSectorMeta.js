const { FocusSector } = require("../models");

const FOCUS_SECTOR_META = [
  ["pharmaceutical-biotech", 0, "pill"],
  ["electrical-machinery-equipment", 1, "zap"],
  ["ready-made-garments", 2, "shirt"],
  ["automobile", 3, "car"],
  ["organic-chemicals", 4, "flask"],
  ["aerospace", 5, "rocket"],
  ["optical-and-medical", 6, "eye"],
  ["food-products", 7, "wheat"],
];

async function backfillFocusSectorOrderAndIcons() {
  let matched = 0;
  let changed = 0;
  for (const [slug, order, icon] of FOCUS_SECTOR_META) {
    const result = await FocusSector.updateOne({ slug }, { $set: { order, icon } });
    if (result.matchedCount) matched += 1;
    if (result.modifiedCount) changed += 1;
  }
  return { matched, changed };
}

module.exports = { FOCUS_SECTOR_META, backfillFocusSectorOrderAndIcons };
