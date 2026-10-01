const env = require("./config/env");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");
const { migrateRoles } = require("./scripts/migrateRoles");
const { expireStaleSessions } = require("./utils/audit");

async function main() {
  await connectDb();
  await migrateRoles();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`VTPC API listening on ${env.publicBaseUrl} (port ${env.port})`);
  });
  setInterval(() => {
    expireStaleSessions().catch((err) => console.error("audit expire job:", err.message));
  }, 5 * 60 * 1000);
  expireStaleSessions().catch(() => {});
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
