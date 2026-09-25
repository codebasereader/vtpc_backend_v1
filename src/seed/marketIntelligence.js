const fs = require("fs");
const path = require("path");
const { StateExport, TopProduct, CountryProduct } = require("../models");
const { replaceCollection } = require("../utils/bulkReplace");

const DATA_DIR = path.resolve(__dirname, "../../data/market-intelligence");

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

async function importMarketIntelligence() {
  let imported = 0;
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

module.exports = { importMarketIntelligence, DATA_DIR };
