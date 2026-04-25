const { User } = require("../models");
const { envConfig } = require("../config");

const DEFAULT_SUPER_ADMIN_EMAIL = "superadmin@mortgagecrm.local";
const DEFAULT_SUPER_ADMIN_PASSWORD = "ChangeMe123!";

async function normalizeSystemRoles() {
  await User.updateMany(
    { role: { $nin: ["superAdmin", "user"] } },
    { $set: { role: "user" } }
  );
}

async function ensureDefaultSuperAdmin() {
  const existing = await User.findOne({ role: "superAdmin" }).lean();
  if (existing) {
    return existing;
  }

  if (envConfig.NODE_ENV === "production" && !process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error(
      "Missing SUPER_ADMIN_PASSWORD in production. Refusing to seed a default super admin."
    );
  }

  const email = process.env.SUPER_ADMIN_EMAIL || DEFAULT_SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD;
  const username = process.env.SUPER_ADMIN_USERNAME || "superadmin";
  const fullName = process.env.SUPER_ADMIN_FULL_NAME || "System Super Admin";

  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    existingByEmail.role = "superAdmin";
    await existingByEmail.save();
    return existingByEmail;
  }

  const existingByUsername = await User.findOne({ username });
  const finalUsername = existingByUsername ? `superadmin-${Date.now()}` : username;

  const user = await User.create({
    fullName,
    username: finalUsername,
    email,
    password,
    role: "superAdmin",
    isEmailVerified: true,
  });

  if (envConfig.NODE_ENV !== "production" || !process.env.SUPER_ADMIN_PASSWORD) {
    console.warn(
      "[seed] Super admin created. Set SUPER_ADMIN_PASSWORD in environment for production safety."
    );
  }

  return user;
}

module.exports = {
  normalizeSystemRoles,
  ensureDefaultSuperAdmin,
};
