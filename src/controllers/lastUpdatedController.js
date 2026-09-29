const {
  Page,
  GIProduct,
  Event,
  Download,
  HomepageContent,
  FocusSector,
  District,
  Office,
  StaffMember,
  Leader,
  DownloadCategory,
} = require("../models");
const { asyncHandler } = require("../utils/errors");

const MODELS = [
  Page,
  GIProduct,
  Event,
  Download,
  HomepageContent,
  FocusSector,
  District,
  Office,
  StaffMember,
  Leader,
  DownloadCategory,
];

const lastUpdated = asyncHandler(async (req, res) => {
  const docs = await Promise.all(
    MODELS.map((Model) => Model.findOne().sort({ updatedAt: -1 }).select("updatedAt").lean())
  );
  const max = docs.reduce((latest, doc) => {
    const at = doc?.updatedAt;
    if (!at) return latest;
    return !latest || at > latest ? at : latest;
  }, null);
  res.json({ updatedAt: max });
});

module.exports = { lastUpdated };
