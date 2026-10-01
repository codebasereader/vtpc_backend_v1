const { Role, AdminUser } = require("../models");
const { PERMISSION_KEYS } = require("../config/permissions");

async function ensureSystemRoles() {
  let superAdmin = await Role.findOne({ isSystem: true });
  if (!superAdmin) {
    superAdmin = await Role.findOne({ slug: "super-admin" });
  }
  if (!superAdmin) {
    superAdmin = await Role.create({
      name: "Super Admin",
      slug: "super-admin",
      description: "Full access, including roles, users and audit logs",
      permissions: [],
      isSystem: true,
    });
    console.log("Role: created Super Admin");
  } else if (!superAdmin.isSystem) {
    superAdmin.isSystem = true;
    superAdmin.permissions = [];
    await superAdmin.save();
  }

  let editor = await Role.findOne({ slug: "editor" });
  if (!editor) {
    editor = await Role.create({
      name: "Editor",
      slug: "editor",
      description: "All content pages (legacy default)",
      permissions: [...PERMISSION_KEYS],
      isSystem: false,
    });
    console.log("Role: created Editor");
  } else {
    const missing = PERMISSION_KEYS.filter((key) => !editor.permissions.includes(key));
    if (missing.length) {
      editor.permissions = [...new Set([...editor.permissions, ...PERMISSION_KEYS])];
      await editor.save();
    }
  }

  return { superAdmin, editor };
}

function roleIdFromLegacy(value, superAdmin, editor) {
  if (!value) return editor._id;
  if (typeof value === "string" && (value === "admin" || value === "super-admin")) return superAdmin._id;
  if (typeof value === "string" && (value === "editor" || value.length !== 24)) return editor._id;
  return value;
}

async function migrateRoles() {
  const { superAdmin, editor } = await ensureSystemRoles();
  const users = await AdminUser.collection.find({}).toArray();
  let updated = 0;
  for (const row of users) {
    const $set = {};
    if (typeof row.role === "string" || !row.role) {
      $set.role = roleIdFromLegacy(row.role, superAdmin, editor);
    }
    if (row.isActive === undefined) $set.isActive = true;
    if (row.mustChangePassword === undefined) $set.mustChangePassword = false;
    if (Object.keys($set).length) {
      await AdminUser.collection.updateOne({ _id: row._id }, { $set });
      updated += 1;
    }
  }
  if (updated) console.log(`AdminUser: migrated ${updated} user(s) onto Role refs`);

  const superCount = await AdminUser.countDocuments({ role: superAdmin._id, isActive: { $ne: false } });
  if (superCount === 0) {
    const fallback =
      (await AdminUser.findOne({ email: "editor@vtpc.gov.in" })) || (await AdminUser.findOne());
    if (fallback) {
      fallback.role = superAdmin._id;
      fallback.isActive = true;
      await fallback.save();
      console.log(`AdminUser: promoted ${fallback.email} to Super Admin`);
    }
  }
  return { superAdmin, editor };
}

module.exports = { migrateRoles, ensureSystemRoles };

if (require.main === module) {
  const { connectDb } = require("../config/db");
  connectDb()
    .then(() => migrateRoles())
    .then(() => {
      console.log("Role migration complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
