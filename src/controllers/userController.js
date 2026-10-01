const { AdminUser, Role } = require("../models");
const { asyncHandler, HttpError } = require("../utils/errors");
const { findByParamOrThrow } = require("../utils/lookup");
const { assertPassword } = require("../utils/password");
const { roleView } = require("../utils/access");
const { record, endUserSessions } = require("../utils/audit");

function userJson(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: roleView(user.role),
    isActive: Boolean(user.isActive),
    mustChangePassword: Boolean(user.mustChangePassword),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
  };
}

async function countActiveSuperAdmins(exceptUserId) {
  const system = await Role.findOne({ isSystem: true });
  if (!system) return 0;
  const filter = { role: system._id, isActive: true };
  if (exceptUserId) filter._id = { $ne: exceptUserId };
  return AdminUser.countDocuments(filter);
}

function isSelf(req, user) {
  return String(req.user._id) === String(user._id);
}

const list = asyncHandler(async (req, res) => {
  const rows = await AdminUser.find().populate("role").sort({ name: 1 });
  res.json(rows.map(userJson));
});

const create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = assertPassword(req.body?.password);
  if (!name || !email || !email.includes("@")) {
    throw new HttpError(400, "name, email and password are required");
  }
  const role = await Role.findById(req.body?.roleId);
  if (!role) throw new HttpError(400, "roleId is required");
  if (await AdminUser.exists({ email })) {
    throw new HttpError(409, "A user with this email already exists");
  }
  const user = await AdminUser.create({
    name,
    email,
    role: role._id,
    passwordHash: await AdminUser.hashPassword(password),
    isActive: true,
    mustChangePassword: true,
  });
  user.role = role;
  record(req, {
    action: "create",
    resource: "users",
    target: { id: String(user._id), label: user.email },
    summary: `Created user ${user.name} <${user.email}> as ${role.name}`,
  });
  res.status(201).json(userJson(user));
});

const update = asyncHandler(async (req, res) => {
  const user = await findByParamOrThrow(AdminUser, req.params.id, null, "User");
  await user.populate("role");
  if (isSelf(req, user) && req.body?.roleId && String(req.body.roleId) !== String(user.role._id)) {
    throw new HttpError(409, "You cannot change your own role");
  }
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!name || !email || !email.includes("@")) {
    throw new HttpError(400, "name and email are required");
  }
  const role = await Role.findById(req.body?.roleId);
  if (!role) throw new HttpError(400, "roleId is required");
  const emailTaken = await AdminUser.exists({ email, _id: { $ne: user._id } });
  if (emailTaken) throw new HttpError(409, "A user with this email already exists");

  if (user.role?.isSystem && !role.isSystem) {
    const remaining = await countActiveSuperAdmins(user._id);
    if (user.isActive && remaining < 1) {
      throw new HttpError(409, "There must be at least one active Super Admin");
    }
  }

  const before = { name: user.name, email: user.email, roleId: String(user.role._id) };
  user.name = name;
  user.email = email;
  user.role = role._id;
  await user.save();
  user.role = role;
  record(req, {
    action: "update",
    resource: "users",
    target: { id: String(user._id), label: user.email },
    summary: `Updated user ${user.name} <${user.email}>`,
    changes: [
      before.name !== name && { field: "name", from: before.name, to: name },
      before.email !== email && { field: "email", from: before.email, to: email },
      before.roleId !== String(role._id) && { field: "role", from: before.roleId, to: String(role._id) },
    ].filter(Boolean),
  });
  res.json(userJson(user));
});

const patchActive = asyncHandler(async (req, res) => {
  if (typeof req.body?.isActive !== "boolean") {
    throw new HttpError(400, "isActive must be true or false");
  }
  const user = await findByParamOrThrow(AdminUser, req.params.id, null, "User");
  await user.populate("role");
  if (isSelf(req, user)) {
    throw new HttpError(409, "You cannot deactivate yourself");
  }
  if (!req.body.isActive && user.role?.isSystem) {
    const remaining = await countActiveSuperAdmins(user._id);
    if (remaining < 1) {
      throw new HttpError(409, "There must be at least one active Super Admin");
    }
  }
  user.isActive = req.body.isActive;
  await user.save();
  if (!user.isActive) {
    await endUserSessions(user._id, "deactivated");
  }
  record(req, {
    action: "status_change",
    resource: "users",
    target: { id: String(user._id), label: user.email },
    summary: `${user.isActive ? "Activated" : "Deactivated"} user ${user.email}`,
    changes: [{ field: "isActive", from: !user.isActive, to: user.isActive }],
  });
  res.json(userJson(user));
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await findByParamOrThrow(AdminUser, req.params.id, null, "User");
  await user.populate("role");
  const newPassword = assertPassword(req.body?.newPassword, "New password");
  user.passwordHash = await AdminUser.hashPassword(newPassword);
  user.mustChangePassword = true;
  await user.save();
  await endUserSessions(user._id, "password_reset");
  record(req, {
    action: "password_reset",
    resource: "users",
    target: { id: String(user._id), label: user.email },
    summary: `Reset password for ${user.email}`,
  });
  res.json({ message: "Password reset" });
});

const remove = asyncHandler(async (req, res) => {
  const user = await findByParamOrThrow(AdminUser, req.params.id, null, "User");
  await user.populate("role");
  if (isSelf(req, user)) {
    throw new HttpError(409, "You cannot delete yourself");
  }
  if (user.role?.isSystem && user.isActive) {
    const remaining = await countActiveSuperAdmins(user._id);
    if (remaining < 1) {
      throw new HttpError(409, "There must be at least one active Super Admin");
    }
  }
  await endUserSessions(user._id, "deactivated");
  record(req, {
    action: "delete",
    resource: "users",
    target: { id: String(user._id), label: user.email },
    summary: `Deleted user ${user.name} <${user.email}>`,
  });
  await user.deleteOne();
  res.json({ message: "User deleted" });
});

module.exports = { list, create, update, patchActive, resetPassword, remove };
