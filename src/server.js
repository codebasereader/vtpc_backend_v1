const env = require("./config/env");
const { connectDb } = require("./config/db");
const { createApp } = require("./app");

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`VTPC API listening on ${env.publicBaseUrl} (port ${env.port})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
