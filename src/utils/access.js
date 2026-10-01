const { PERMISSION_KEYS } = require("../config/permissions");

function roleDoc(user) {
  const role = user?.role;
  if (!role || typeof role !== "object") return null;
  if (!role._id && !role.id) return null;
  return role;
}

function isSuperAdmin(user) {
  return Boolean(roleDoc(user)?.isSystem);
}

function permissionList(user) {
  if (isSuperAdmin(user)) return [...PERMISSION_KEYS];
  const role = roleDoc(user);
  if (!role) return [];
  return (role.permissions || []).filter((key) => PERMISSION_KEYS.includes(key));
}

function roleView(role) {
  if (!role) return null;
  return {
    id: String(role._id || role.id),
    name: role.name,
    slug: role.slug,
    isSuperAdmin: Boolean(role.isSystem),
  };
}

function authView(user) {
  const role = roleDoc(user);
  const superAdmin = Boolean(role?.isSystem);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: roleView(role),
    permissions: permissionList(user),
    isSuperAdmin: superAdmin,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

function actorSnapshot(user) {
  if (!user) return { id: "", name: "", email: "" };
  return {
    id: String(user._id || user.id || ""),
    name: user.name || "",
    email: user.email || "",
  };
}

function roleSnapshot(user) {
  const role = roleDoc(user);
  if (!role) return { id: "", name: "" };
  return { id: String(role._id || role.id), name: role.name || "" };
}

function recordLabel(doc) {
  if (!doc) return "";
  if (doc.name && typeof doc.name === "object") return doc.name.en || doc.name.kn || "";
  if (typeof doc.name === "string") return doc.name;
  if (doc.title && typeof doc.title === "object") return doc.title.en || "";
  if (typeof doc.title === "string") return doc.title;
  if (doc.subject) return doc.subject;
  if (doc.email) return doc.email;
  if (doc.slug) return doc.slug;
  return String(doc.id || doc._id || "");
}

module.exports = {
  isSuperAdmin,
  permissionList,
  roleView,
  authView,
  actorSnapshot,
  roleSnapshot,
  recordLabel,
};
