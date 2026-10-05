const { Role, AdminUser } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { toSlug } = require("../utils/slug");
const { PERMISSION_GROUPS, isCatalogKey } = require("../config/permissions");
const { record } = require("../utils/audit");

function roleJson(role, userCount = 0) {
  const json = role.toJSON();
  return {
    id: json.id,
    name: json.name,
    slug: json.slug,
    description: json.description || "",
    // Keys that are no longer in the catalog (e.g. a removed page) are hidden.
    permissions: json.isSystem ? [] : (json.permissions || []).filter(isCatalogKey),
    isSystem: Boolean(json.isSystem),
    userCount,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
  };
}

const listPermissions = asyncHandler(async (req, res) => {
  res.json(PERMISSION_GROUPS);
});

const list = asyncHandler(async (req, res) => {
  const roles = await Role.find();
  const counts = await AdminUser.aggregate([
    { $group: { _id: "$role", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((row) => [String(row._id), row.n]));
  roles.sort((a, b) => {
    if (a.isSystem && !b.isSystem) return -1;
    if (!a.isSystem && b.isSystem) return 1;
    return a.name.localeCompare(b.name);
  });
  res.json(roles.map((role) => roleJson(role, countMap.get(String(role._id)) || 0)));
});

const create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (name.length < 2 || name.length > 60) {
    throw new HttpError(400, "name must be 2–60 characters");
  }
  const existing = await Role.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  if (existing) {
    throw new HttpError(409, "A role with this name already exists");
  }
  let slug = toSlug(name);
  if (!slug) throw new HttpError(400, "name must contain letters or numbers");
  if (await Role.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`;
  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
  for (const key of permissions) {
    if (!isCatalogKey(key)) throw new HttpError(400, `Unknown permission: ${key}`);
  }
  const role = await Role.create({
    name,
    slug,
    description: String(req.body?.description || "").trim().slice(0, 300),
    permissions,
    isSystem: false,
  });
  record(req, {
    action: "create",
    resource: "roles",
    target: { id: String(role._id), label: role.name },
    summary: `Created role “${role.name}”`,
  });
  res.status(201).json(roleJson(role, 0));
});

const update = asyncHandler(async (req, res) => {
  const role = await findByParamOrThrow(Role, req.params.id, "slug", "Role");
  if (role.isSystem) {
    throw new HttpError(403, "The Super Admin role cannot be edited", "FORBIDDEN");
  }
  const name = String(req.body?.name || "").trim();
  if (name.length < 2 || name.length > 60) {
    throw new HttpError(400, "name must be 2–60 characters");
  }
  const clash = await Role.findOne({
    _id: { $ne: role._id },
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
  if (clash) throw new HttpError(409, "A role with this name already exists");
  const before = role.name;
  role.name = name;
  role.description = String(req.body?.description || "").trim().slice(0, 300);
  await role.save();
  const userCount = await AdminUser.countDocuments({ role: role._id });
  record(req, {
    action: "update",
    resource: "roles",
    target: { id: String(role._id), label: role.name },
    summary: `Updated role “${role.name}”`,
    changes: before === name ? [] : [{ field: "name", from: before, to: name }],
  });
  res.json(roleJson(role, userCount));
});

const updatePermissions = asyncHandler(async (req, res) => {
  const role = await findByParamOrThrow(Role, req.params.id, "slug", "Role");
  if (role.isSystem) {
    throw new HttpError(403, "The Super Admin role cannot have its permissions changed", "FORBIDDEN");
  }
  const permissions = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String) : null;
  if (!permissions) throw new HttpError(400, "permissions must be an array");
  for (const key of permissions) {
    if (!isCatalogKey(key)) throw new HttpError(400, `Unknown permission: ${key}`);
  }
  const unique = [...new Set(permissions)];
  const from = [...(role.permissions || [])];
  const added = unique.filter((key) => !from.includes(key));
  const removed = from.filter((key) => !unique.includes(key));
  role.permissions = unique;
  await role.save();
  const userCount = await AdminUser.countDocuments({ role: role._id });
  record(req, {
    action: "permissions_change",
    resource: "roleAccess",
    target: { id: String(role._id), label: role.name },
    summary: `Updated access for “${role.name}”: added ${added.length}, removed ${removed.length}`,
    changes: [{ field: "permissions", from, to: unique }],
  });
  res.json(roleJson(role, userCount));
});

const remove = asyncHandler(async (req, res) => {
  const role = await findByParamOrThrow(Role, req.params.id, "slug", "Role");
  if (role.isSystem) {
    throw new HttpError(403, "The Super Admin role cannot be deleted", "FORBIDDEN");
  }
  const userCount = await AdminUser.countDocuments({ role: role._id });
  if (userCount) {
    throw new HttpError(409, "Cannot delete a role that is assigned to users");
  }
  await role.deleteOne();
  record(req, {
    action: "delete",
    resource: "roles",
    target: { id: String(role._id), label: role.name },
    summary: `Deleted role “${role.name}”`,
  });
  res.json({ message: "Role deleted" });
});

module.exports = { listPermissions, list, create, update, updatePermissions, remove };
