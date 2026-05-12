const Joi = require("joi");

const createOrganization = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(120).required(),
  }),
};

const updateProfile = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(2).max(120).optional(),
      legalName: Joi.string().trim().max(160).allow("", null).optional(),
      website: Joi.string().trim().allow("", null).optional(),
      industry: Joi.string().trim().allow("", null).optional(),
      size: Joi.string().trim().allow("", null).optional(),
      contactEmail: Joi.string().trim().email().allow("", null).optional(),
      phone: Joi.string().trim().allow("", null).optional(),
      addressLine1: Joi.string().trim().allow("", null).optional(),
      addressLine2: Joi.string().trim().allow("", null).optional(),
      addressCity: Joi.string().trim().allow("", null).optional(),
      addressState: Joi.string().trim().allow("", null).optional(),
      addressPostalCode: Joi.string().trim().allow("", null).optional(),
      addressCountry: Joi.string().trim().allow("", null).optional(),
      settingsTimezone: Joi.string().trim().allow("", null).optional(),
      settingsLocale: Joi.string().trim().allow("", null).optional(),
      settingsCurrency: Joi.string().trim().allow("", null).optional(),
    })
    .min(1),
};

const objectId = Joi.string().hex().length(24).required();

const listMembers = {
  query: Joi.object().keys({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("createdAt"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    role: Joi.string().valid("Owner", "Admin", "Member", "Viewer", "owner", "admin", "member", "viewer"),
    search: Joi.string().allow(""),
  }),
};

const workspaceRoleEntry = Joi.object({
  workspaceId: objectId,
  workspaceRoleId: Joi.string().hex().length(24).optional(),
  role: Joi.string().valid("Admin", "Agent", "Viewer", "admin", "agent", "viewer").optional(),
}).or("workspaceRoleId", "role");

const addMember = {
  body: Joi.object().keys({
    fullName: Joi.string().trim().min(2).max(120).required(),
    username: Joi.string().trim().min(3).max(60).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).allow("").optional(),
    organizationRoleId: Joi.string().hex().length(24).optional(),
    organizationRole: Joi.string().valid("Owner", "Admin", "Member", "Viewer", "owner", "admin", "member", "viewer").optional(),
    workspaceRoles: Joi.array().items(workspaceRoleEntry).default([]),
  }),
};

const updateMemberRole = {
  params: Joi.object().keys({
    userId: objectId,
  }),
  body: Joi.object()
    .keys({
      organizationRoleId: Joi.string().hex().length(24).optional(),
      role: Joi.string().valid("Owner", "Admin", "Member", "Viewer", "owner", "admin", "member", "viewer").optional(),
    })
    .or("organizationRoleId", "role"),
};

const updateWorkspaceRole = {
  params: Joi.object().keys({
    userId: objectId,
    workspaceId: objectId,
  }),
  body: Joi.object()
    .keys({
      workspaceRoleId: Joi.string().hex().length(24).optional(),
      role: Joi.string().valid("Admin", "Agent", "Viewer", "admin", "agent", "viewer").optional(),
    })
    .or("workspaceRoleId", "role"),
};

const removeWorkspaceAccess = {
  params: Joi.object().keys({
    userId: objectId,
    workspaceId: objectId,
  }),
};

const removeMember = {
  params: Joi.object().keys({
    userId: objectId,
  }),
};

module.exports = {
  createOrganization,
  updateProfile,
  listMembers,
  addMember,
  updateMemberRole,
  updateWorkspaceRole,
  removeWorkspaceAccess,
  removeMember,
};
