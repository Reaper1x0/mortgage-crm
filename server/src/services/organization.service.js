const mongoose = require("mongoose");
const {
  Organization,
  OrganizationMember,
  Workspace,
  WorkspaceMember,
  User,
  OrganizationRole,
  WorkspaceRole,
} = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");
const { ensureOrganizationRbac } = require("./rbacBootstrap.service");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function resolveOrganizationRoleId(organizationId, roleInput) {
  if (!roleInput) return null;
  const str = String(roleInput);
  if (mongoose.isValidObjectId(str)) {
    const found = await OrganizationRole.findOne({ _id: str, organization: organizationId }).lean();
    return found?._id || null;
  }
  const slug = str.toLowerCase();
  const found = await OrganizationRole.findOne({ organization: organizationId, slug }).lean();
  return found?._id || null;
}

async function resolveWorkspaceRoleId(organizationId, roleInput) {
  if (!roleInput) return null;
  const str = String(roleInput);
  if (mongoose.isValidObjectId(str)) {
    const found = await WorkspaceRole.findOne({ _id: str, organization: organizationId }).lean();
    return found?._id || null;
  }
  const slug = str.toLowerCase();
  let found = await WorkspaceRole.findOne({ organization: organizationId, slug }).lean();
  if (!found && ["viewer", "agent", "admin"].includes(slug)) {
    found = await WorkspaceRole.findOne({ organization: organizationId, slug: "full-access", kind: "system" }).lean();
  }
  return found?._id || null;
}

const OrganizationService = {
  resolveOrganizationRoleId,
  resolveWorkspaceRoleId,

  getRoleStats: async (organizationId) => {
    const orgObjId =
      typeof organizationId === "string" ? new mongoose.Types.ObjectId(organizationId) : organizationId;
    const rows = await OrganizationMember.aggregate([
      { $match: { organization: orgObjId } },
      {
        $lookup: {
          from: "organization_roles",
          localField: "organizationRole",
          foreignField: "_id",
          as: "r",
        },
      },
      { $unwind: "$r" },
      { $group: { _id: "$r.slug", count: { $sum: 1 } } },
    ]);
    const bySlug = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const ownerMembers = await OrganizationMember.countDocuments({ organization: orgObjId, isOwner: true });
    return {
      ownerCount: ownerMembers,
      adminCount: bySlug.admin || 0,
      memberCount: bySlug.member || 0,
      viewerCount: bySlug.viewer || 0,
    };
  },

  validateMemberRemovalPolicy: ({
    actorUserId,
    targetUserId,
    targetIsOwner,
    targetOrgRoleSlug,
    actorHasRemove,
    actorHasPromoteAdmin,
    roleStats,
  }) => {
    if (String(actorUserId) === String(targetUserId)) {
      return { ok: false, status: 400, message: "You cannot remove your own organization membership." };
    }
    if (targetIsOwner) {
      return { ok: false, status: 403, message: "Owners cannot be removed from organization." };
    }
    if (!actorHasRemove) {
      return { ok: false, status: 403, message: "You do not have permission to remove organization users." };
    }
    if (targetOrgRoleSlug === "admin" && !actorHasPromoteAdmin) {
      return { ok: false, status: 403, message: "Only privileged administrators can remove admin users." };
    }
    if (targetOrgRoleSlug === "admin" && (roleStats?.adminCount || 0) <= 1) {
      return { ok: false, status: 400, message: "At least one admin must remain in the organization." };
    }
    return { ok: true };
  },

  validateRoleUpdatePolicy: ({
    actorUserId,
    targetUserId,
    targetIsOwner,
    targetOrgRoleSlug,
    nextOrgRoleSlug,
    actorHasUpdate,
    actorHasPromoteAdmin,
    roleStats,
  }) => {
    if (targetIsOwner) {
      return { ok: false, status: 403, message: "Owner membership cannot be changed this way." };
    }
    if (!actorHasUpdate) {
      return { ok: false, status: 403, message: "You do not have permission to update organization roles." };
    }
    if (targetOrgRoleSlug === "admin" && !actorHasPromoteAdmin) {
      return { ok: false, status: 403, message: "Only privileged administrators can update admin users." };
    }
    if (nextOrgRoleSlug === "admin" && !actorHasPromoteAdmin) {
      return { ok: false, status: 403, message: "Only privileged administrators can assign admin role." };
    }
    if (String(actorUserId) === String(targetUserId) && targetOrgRoleSlug === "admin" && nextOrgRoleSlug !== "admin") {
      return { ok: false, status: 400, message: "You cannot demote your own admin role." };
    }
    if (targetOrgRoleSlug === "admin" && nextOrgRoleSlug !== "admin" && (roleStats?.adminCount || 0) <= 1) {
      return { ok: false, status: 400, message: "At least one admin must remain in the organization." };
    }
    return { ok: true };
  },

  createOrganization: async ({ name, createdBy }) => {
    const base = slugify(name) || "organization";
    let slug = base;
    let counter = 1;
    while (await Organization.findOne({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }

    const organization = await Organization.create({
      name: String(name || "Organization").trim(),
      slug,
      createdBy,
    });

    const { orgRoleIds } = await ensureOrganizationRbac(organization._id);

    await OrganizationMember.create({
      user: createdBy,
      organization: organization._id,
      isOwner: true,
      organizationRole: orgRoleIds.owner,
    });

    return organization;
  },

  findMembership: async (userId, organizationId) => {
    return OrganizationMember.findOne({ user: userId, organization: organizationId })
      .populate({ path: "organizationRole", select: "slug name kind groupIds" })
      .lean();
  },

  listForUser: async (userId) => {
    const memberships = await OrganizationMember.find({ user: userId })
      .populate("organization")
      .populate({ path: "organizationRole", select: "slug name kind" })
      .lean();
    return memberships
      .filter((m) => m.organization)
      .map((m) => ({
        organizationId: String(m.organization._id),
        name: m.organization.name,
        slug: m.organization.slug,
        isOrgOwner: !!m.isOwner,
        organizationRole: m.organizationRole?.slug || null,
        organizationRoleId: m.organizationRole?._id ? String(m.organizationRole._id) : null,
        branding: m.organization.branding || null,
      }));
  },

  updateBranding: async (organizationId, brandingPatch = {}) => {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const next = { ...(organization.branding?.toObject ? organization.branding.toObject() : organization.branding) };
    for (const [key, val] of Object.entries(brandingPatch)) {
      if (typeof val !== "undefined") next[key] = val;
    }
    organization.branding = next;
    await organization.save();
    return organization;
  },

  updateProfile: async (organizationId, profilePatch = {}) => {
    const organization = await Organization.findById(organizationId);
    if (!organization) return null;

    const directFields = [
      "name",
      "legalName",
      "website",
      "industry",
      "size",
      "contactEmail",
      "phone",
    ];
    directFields.forEach((field) => {
      if (typeof profilePatch[field] !== "undefined") organization[field] = profilePatch[field];
    });

    if (profilePatch.address && typeof profilePatch.address === "object") {
      organization.address = {
        ...(organization.address?.toObject ? organization.address.toObject() : organization.address || {}),
        ...profilePatch.address,
      };
    }

    if (profilePatch.settings && typeof profilePatch.settings === "object") {
      organization.settings = {
        ...(organization.settings?.toObject ? organization.settings.toObject() : organization.settings || {}),
        ...profilePatch.settings,
      };
    }

    await organization.save();
    return organization;
  },

  listWorkspacesForOrganization: async (organizationId) => {
    const rows = await Workspace.find({ organization: organizationId }).select("_id name slug").sort({ name: 1 }).lean();
    return rows.map((row) => ({
      workspaceId: String(row._id),
      name: row.name,
      slug: row.slug,
    }));
  },

  listMembersPaginated: async ({
    organizationId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    role,
    search,
  }) => {
    const orgObjId =
      typeof organizationId === "string" ? new mongoose.Types.ObjectId(organizationId) : organizationId;
    const memberMatch = { organization: orgObjId };

    if (role) {
      const r = String(role);
      if (r === "Owner") {
        memberMatch.isOwner = true;
      } else if (["Admin", "Member", "Viewer", "admin", "member", "viewer"].includes(r)) {
        const slug = r.toLowerCase();
        const roleDoc = await OrganizationRole.findOne({ organization: orgObjId, slug }).select("_id").lean();
        if (roleDoc) memberMatch.organizationRole = roleDoc._id;
      }
    }

    const pipeline = [{ $match: memberMatch }];
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },
      {
        $lookup: {
          from: "organization_roles",
          localField: "organizationRole",
          foreignField: "_id",
          as: "orgRole",
        },
      },
      { $unwind: "$orgRole" }
    );

    if (search && String(search).trim()) {
      const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      pipeline.push({
        $match: { $or: [{ "u.fullName": re }, { "u.email": re }, { "u.username": re }] },
      });
    }

    const sortDir = sortOrder === "asc" ? 1 : -1;
    const userFieldSort = { fullName: "fullName", email: "email", username: "username" };
    let sortStage = { createdAt: -1 };
    if (sortBy === "role") sortStage = { "orgRole.slug": sortDir };
    else if (userFieldSort[sortBy]) sortStage = { [`u.${userFieldSort[sortBy]}`]: sortDir };
    else if (["createdAt", "updatedAt"].includes(sortBy)) sortStage = { [sortBy]: sortDir };
    pipeline.push({ $sort: sortStage });

    const skip = (page - 1) * limit;
    pipeline.push({
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        count: [{ $count: "total" }],
      },
    });

    const agg = await OrganizationMember.aggregate(pipeline);
    const rows = agg[0]?.rows || [];
    const total = agg[0]?.count[0]?.total || 0;
    const userIds = rows.map((r) => r.u._id);

    if (userIds.length === 0) {
      return { items: [], pagination: buildPaginationMeta({ page, limit, total }) };
    }

    const [users, workspaceMemberships] = await Promise.all([
      User.find({ _id: { $in: userIds } }).populate({ path: "profile_picture", select: "url storage_path display_name" }).lean(),
      WorkspaceMember.find({ organization: orgObjId, user: { $in: userIds } })
        .populate({ path: "workspace", select: "name slug" })
        .populate({ path: "workspaceRole", select: "slug name" })
        .lean(),
    ]);

    const byUser = new Map();
    workspaceMemberships.forEach((membership) => {
      const key = String(membership.user);
      const list = byUser.get(key) || [];
      if (membership.workspace) {
        list.push({
          workspaceId: String(membership.workspace._id),
          workspaceName: membership.workspace.name,
          workspaceSlug: membership.workspace.slug,
          workspaceRoleId: membership.workspaceRole?._id ? String(membership.workspaceRole._id) : null,
          workspaceRole: membership.workspaceRole?.slug || null,
        });
      }
      byUser.set(key, list);
    });

    const allWorkspaces = await Workspace.find({ organization: orgObjId })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean();
    const fullAccessWsRole = await WorkspaceRole.findOne({
      organization: orgObjId,
      slug: "full-access",
      kind: "system",
    })
      .select("_id")
      .lean();

    const usersById = new Map(users.map((u) => [String(u._id), u]));
    const items = rows
      .map((row) => {
        const user = usersById.get(String(row.u._id));
        if (!user) return null;
        const orgSlug = row.orgRole?.slug;
        const displayRole = row.isOwner ? "Owner" : orgSlug ? orgSlug.charAt(0).toUpperCase() + orgSlug.slice(1) : "";
        let workspaceMemberships = (byUser.get(String(row.u._id)) || []).sort((a, b) =>
          a.workspaceName.localeCompare(b.workspaceName)
        );
        if (row.isOwner && allWorkspaces.length > 0) {
          workspaceMemberships = allWorkspaces.map((ws) => ({
            workspaceId: String(ws._id),
            workspaceName: ws.name,
            workspaceSlug: ws.slug,
            workspaceRoleId: fullAccessWsRole?._id ? String(fullAccessWsRole._id) : null,
            workspaceRole: "full-access",
          }));
        }
        return {
          ...user,
          isOrgOwner: !!row.isOwner,
          organizationRoleId: row.organizationRole ? String(row.organizationRole) : null,
          organizationRoleSlug: orgSlug || null,
          organizationRole: displayRole,
          workspaceMemberships,
        };
      })
      .filter(Boolean);

    return { items, pagination: buildPaginationMeta({ page, limit, total }) };
  },

  addMemberWithAccess: async ({ organizationId, fullName, username, email, password, organizationRoleId, workspaceRoles }) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedWorkspaceRoles = Array.isArray(workspaceRoles) ? workspaceRoles : [];
    const orgId = typeof organizationId === "string" ? organizationId : String(organizationId);

    await ensureOrganizationRbac(orgId);
    const resolvedOrgRoleId =
      (await resolveOrganizationRoleId(orgId, organizationRoleId)) || (await resolveOrganizationRoleId(orgId, "member"));

    let user = await User.findOne({ email: normalizedEmail });
    let createdNewUser = false;

    const existingOrgMembership = user
      ? await OrganizationMember.findOne({ user: user._id, organization: orgId }).lean()
      : null;

    if (!user) {
      if (!password || String(password).length < 8) {
        return { ok: false, code: "PASSWORD_REQUIRED" };
      }
      const existingUsername = await User.findOne({ username });
      if (existingUsername) return { ok: false, code: "USERNAME_TAKEN" };
      user = await User.create({
        fullName,
        username,
        email: normalizedEmail,
        password,
        role: "user",
      });
      createdNewUser = true;
    }

    if (!existingOrgMembership) {
      await OrganizationMember.create({
        user: user._id,
        organization: orgId,
        isOwner: false,
        organizationRole: resolvedOrgRoleId,
      });
    }

    for (const wr of normalizedWorkspaceRoles) {
      const wsRoleId =
        (await resolveWorkspaceRoleId(orgId, wr.workspaceRoleId || wr.role)) || (await resolveWorkspaceRoleId(orgId, "viewer"));
      if (!wsRoleId) continue;
      await WorkspaceMember.updateOne(
        {
          user: user._id,
          workspace: wr.workspaceId,
          organization: orgId,
        },
        {
          $set: {
            workspaceRole: wsRoleId,
            user: user._id,
            workspace: wr.workspaceId,
            organization: orgId,
          },
        },
        { upsert: true }
      );
    }

    return { ok: true, user, createdNewUser };
  },

  updateOrganizationMemberRole: async ({ organizationId, userId, organizationRoleId }) => {
    return OrganizationMember.findOneAndUpdate(
      { organization: organizationId, user: userId },
      { organizationRole: organizationRoleId },
      { new: true }
    ).populate({ path: "organizationRole", select: "slug name" });
  },
};

module.exports = OrganizationService;
