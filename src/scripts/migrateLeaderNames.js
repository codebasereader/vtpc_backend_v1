const { connectDb } = require("../config/db");
const { Leader } = require("../models");

async function migrateLeaderNames() {
  const result = await Leader.collection.updateMany({ name: { $type: "string" } }, [
    { $set: { name: { en: "$name", kn: "" } } },
  ]);
  console.log(`Migrated ${result.modifiedCount} leader name(s) from string to { en, kn }`);
}

async function main() {
  await connectDb();
  await migrateLeaderNames();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
