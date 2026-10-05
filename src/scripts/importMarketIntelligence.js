const { connectDb } = require("../config/db");
const { importMarketIntelligence } = require("../seed/marketIntelligence");

async function main() {
  await connectDb();
  const imported = await importMarketIntelligence();
  if (!imported) {
    console.log(
      "No market-intelligence JSON files found. Place releases in data/market-intelligence/releases/ then re-run."
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
