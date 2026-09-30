const { connectDb } = require("../config/db");
const { backfillFocusSectorOrderAndIcons } = require("../seed/focusSectorMeta");

async function main() {
  await connectDb();
  const { matched, changed } = await backfillFocusSectorOrderAndIcons();
  console.log(`FocusSector backfill: matched ${matched}, updated ${changed} (only order + icon).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
