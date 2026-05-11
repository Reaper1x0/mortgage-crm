const mongoose = require("mongoose");
const { Organization, OrganizationMember, Workspace, WorkspaceMember, User } = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");
const entitlementService = require("../billing/entitlement.service");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const OrganizationService = {
  getRoleStats: async (organizationId) => {
    const rows = await OrganizationMember.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(String(organizationId)) } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const roleCounts = { Owner: 0, Admin: 0, Member: 0, Viewer: 0 };
    rows.forEach((row) => {
      if (roleCounts[row._id] !== undefined) roleCounts[row._id] = row.count;
    });
    return {
      ownerCount: roleCounts.Owner,
      adminCount: roleCounts.Admin,
      memberCount: roleCounts.Member,
      viewerCount: roleCounts.Viewer,
    };
  },

  validateMemberRemovalPolicy: ({ actorRole, actorUserId, targetUserId, targetRole, roleStats }) => {
    if (String(actorUserId) === String(targetUserId)) {
      return { ok: false, status: 400, message: "You cannot remove your own organization membership." };
    }
    if (targetRole === "Owner") {
      return { ok: false, status: 403, message: "Owners cannot be removed from organization." };
    }
    if (!["Owner", "Admin"].includes(actorRole)) {
      return { ok: false, status: 403, message: "Only owners or admins can remove organization users." };
    }
    if (targetRole === "Admin") {
      if (actorRole !== "Owner") {
        return { ok: false, status: 403, message: "Only owners can remove admin users." };
      }
      if ((roleStats?.adminCount || 0) <= 1) {
        return { ok: false, status: 400, message: "At least one admin must remain in the organization." };
      }
    }
    return { ok: true };
  },

  validateRoleUpdatePolicy: ({ actorRole, targetUserId, actorUserId, targetRole, nextRole, roleStats }) => {
    if (targetRole === "Owner") {
      return { ok: false, status: 403, message: "Owner role cannot be changed." };
    }
    if (!["Owner", "Admin"].includes(actorRole)) {
      return { ok: false, status: 403, message: "Only owners or admins can update organization roles." };
    }
    if (targetRole === "Admin" && actorRole !== "Owner") {
      return { ok: false, status: 403, message: "Only owners can update admin users." };
    }
    if (nextRole === "Owner" && actorRole !== "Owner") {
      return { ok: false, status: 403, message: "Only owners can assign the owner role." };
    }
    if (nextRole === "Admin" && actorRole !== "Owner") {
      return { ok: false, status: 403, message: "Only owners can assign admin role." };
    }
    if (String(actorUserId) === String(targetUserId) && targetRole === "Admin" && nextRole !== "Admin") {
      return { ok: false, status: 400, message: "You cannot demote your own admin role." };
    }
    if (targetRole === "Admin" && nextRole !== "Admin" && (roleStats?.adminCount || 0) <= 1) {
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

    await OrganizationMember.create({
      user: createdBy,
      organization: organization._id,
      role: "Owner",
    });

    return organization;
  },

  findMembership: async (userId, organizationId) => {
    return OrganizationMember.findOne({ user: userId, organization: organizationId }).lean();
  },

  listForUser: async (userId) => {
    const memberships = await OrganizationMember.find({ user: userId }).populate("organization").lean();
    return memberships
      .filter((m) => m.organization)
      .map((m) => ({
        organizationId: String(m.organization._id),
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
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
    if (role) memberMatch.role = role;

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
      { $unwind: "$u" }
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
    if (sortBy === "role") sortStage = { role: sortDir };
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
          role: membership.role,
        });
      }
      byUser.set(key, list);
    });

    const usersById = new Map(users.map((u) => [String(u._id), u]));
    const items = rows
      .map((row) => {
        const user = usersById.get(String(row.u._id));
        if (!user) return null;
        return {
          ...user,
          organizationRole: row.role,
          workspaceMemberships: (byUser.get(String(row.u._id)) || []).sort((a, b) =>
            a.workspaceName.localeCompare(b.workspaceName)
          ),
        };
      })
      .filter(Boolean);

    return { items, pagination: buildPaginationMeta({ page, limit, total }) };
  },

  addMemberWithAccess: async ({ organizationId, fullName, username, email, password, organizationRole, workspaceRoles }) => {
    const toLimitResult = (check, operation) => ({
      ok: false,
      code: "PLAN_LIMIT_REACHED",
      operation,
      limitError: check,
    });
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedWorkspaceRoles = Array.isArray(workspaceRoles) ? workspaceRoles : [];
    const orgId = typeof organizationId === "string" ? organizationId : String(organizationId);

    let user = await User.findOne({ email: normalizedEmail });
    let createdNewUser = false;

    const existingOrgMembership = user
      ? await OrganizationMember.findOne({ user: user._id, organization: orgId }).lean()
      : null;
    if (!existingOrgMembership) {
      const orgLimit = await entitlementService.assertWithinLimit({
        organizationId: orgId,
        featureKey: "max_organization_members",
        incrementBy: 1,
      });
      if (!orgLimit.ok) return toLimitResult(orgLimit, "organization_member_add");
    }

    for (const workspaceRole of normalizedWorkspaceRoles) {
      const existingWorkspaceMembership = user
        ? await WorkspaceMember.findOne({
            user: user._id,
            organization: orgId,
            workspace: workspaceRole.workspaceId,
          }).lean()
        : null;
      if (!existingWorkspaceMembership) {
        const wsLimit = await entitlementService.assertWithinLimit({
          organizationId: orgId,
          workspaceId: workspaceRole.workspaceId,
          featureKey: "max_workspace_members",
          incrementBy: 1,
        });
        if (!wsLimit.ok) return toLimitResult(wsLimit, "workspace_member_add");
      }
    }

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
        role: organizationRole || "Member",
      });
    }

    for (const workspaceRole of normalizedWorkspaceRoles) {
      await WorkspaceMember.updateOne(
        {
          user: user._id,
          workspace: workspaceRole.workspaceId,
          organization: orgId,
        },
        {
          $set: {
            role: workspaceRole.role,
            user: user._id,
            workspace: workspaceRole.workspaceId,
            organization: orgId,
          },
        },
        { upsert: true }
      );
    }

    return { ok: true, user, createdNewUser };
  },

  updateOrganizationMemberRole: async ({ organizationId, userId, role }) => {
    return OrganizationMember.findOneAndUpdate(
      { organization: organizationId, user: userId },
      { role },
      { new: true }
    );
  },
};

module.exports = OrganizationService;
