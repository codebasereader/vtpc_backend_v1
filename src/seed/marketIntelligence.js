const fs = require("fs");
const path = require("path");
const { StateExport, TopProduct, CountryProduct, MarketRelease } = require("../models");
const { replaceCollection } = require("../utils/bulkReplace");
const { parseRelease } = require("../utils/marketRelease");

const DATA_DIR = path.resolve(__dirname, "../../data/market-intelligence");
const RELEASES_DIR = path.join(DATA_DIR, "releases");

const DATASETS = [
  { file: "state-exports.json", Model: StateExport, label: "StateExport" },
  { file: "top-products.json", Model: TopProduct, label: "TopProduct" },
  { file: "country-products.json", Model: CountryProduct, label: "CountryProduct" },
];

function readJson(file) {
  const abs = path.join(DATA_DIR, file);
  if (!fs.existsSync(abs)) return null;
  const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${file} must be a JSON array`);
  }
  return parsed;
}

async function importMarketReleases() {
  if (!fs.existsSync(RELEASES_DIR)) {
    console.log("MarketRelease: skipped (missing data/market-intelligence/releases/)");
    return 0;
  }
  const files = fs.readdirSync(RELEASES_DIR).filter((name) => name.endsWith(".json"));
  let imported = 0;
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(RELEASES_DIR, file), "utf8"));
    const key = raw.key || path.basename(file, ".json");
    const doc = parseRelease(raw, key);
    doc.updatedBy = "seed";
    await MarketRelease.findOneAndReplace({ key: doc.key }, doc, {
      upsert: true,
      new: true,
      runValidators: true,
    });
    console.log(`MarketRelease: upserted ${doc.key} from releases/${file}`);
    imported += 1;
  }
  return imported;
}

async function importMarketIntelligence() {
  let imported = 0;
  imported += await importMarketReleases();
  for (const { file, Model, label } of DATASETS) {
    const rows = readJson(file);
    if (!rows) {
      console.log(`${label}: skipped (missing data/market-intelligence/${file})`);
      continue;
    }
    const count = await replaceCollection(Model, rows, { label });
    console.log(`${label}: imported ${count} from ${file}`);
    imported += 1;
  }
  return imported;
}

module.exports = { importMarketIntelligence, importMarketReleases, DATA_DIR };
