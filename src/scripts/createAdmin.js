const env = require("../config/env");
const { connectDb } = require("../config/db");
const { AdminUser } = require("../models");

async function main() {
  await connectDb();
  const email = env.admin.email.toLowerCase();
  const passwordHash = await AdminUser.hashPassword(env.admin.password);
  const existing = await AdminUser.findOne({ email });

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = env.admin.name;
    await existing.save();
    console.log(`Updated password for ${email}`);
  } else {
    await AdminUser.create({
      email,
      name: env.admin.name,
      role: "editor",
      passwordHash,
    });
    console.log(`Created admin ${email}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
