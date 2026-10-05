const env = require("../config/env");
const { connectDb } = require("../config/db");
const { AdminUser } = require("../models");
const { migrateRoles } = require("./migrateRoles");

async function main() {
  env.assertSafeAdminPassword();
  await connectDb();
  const { superAdmin } = await migrateRoles();
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
      role: superAdmin._id,
      passwordHash,
      isActive: true,
      mustChangePassword: false,
    });
    console.log(`Created Super Admin ${email}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
