const mongoose = require("mongoose");
const { Workspace, WorkspaceMember, User, OrganizationMember, File } = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");
const organizationService = require("./organization.service");
const { getSignedFileUrl } = require("../utils/fileUrl.utils");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const WorkspaceService = {
  createWorkspaceForSignup: async ({ name, createdBy = null, organizationId }) => {
    const base = slugify(name) || "workspace";
    let slug = base;
    let counter = 1;

    while (await Workspace.findOne({ organization: organizationId, slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }

    return Workspace.create({
      organization: organizationId,
      name: String(name || "Workspace").trim(),
      slug,
      createdBy,
    });
  },

  /**
   * Workspaces the user belongs to, with role per workspace.
   */
  listWorkspacesForUser: async (userId) => {
    const memberships = await WorkspaceMember.find({ user: userId })
      .populate({
        path: "workspace",
        populate: { path: "organization" },
      })
      .lean();
    const rows = memberships
      .filter((m) => m.workspace)
      .map((m) => ({
        workspaceId: String(m.workspace._id),
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        organization: m.workspace.organization
          ? {
              organizationId: String(m.workspace.organization._id),
              name: m.workspace.organization.name,
              slug: m.workspace.organization.slug,
            }
          : null,
        organizationRole: null,
        branding: {
          organization: m.workspace.organization?.branding || null,
          workspace: m.workspace.branding || null,
          effective: m.workspace.branding || m.workspace.organization?.branding || null,
        },
      }));

    const logoFileIds = new Set();
    rows.forEach((row) => {
      const orgLogo = row.branding?.organization?.logoFile;
      const wsLogo = row.branding?.workspace?.logoFile;
      if (orgLogo) logoFileIds.add(String(orgLogo));
      if (wsLogo) logoFileIds.add(String(wsLogo));
    });

    if (logoFileIds.size > 0) {
      const files = await File.find({ _id: { $in: Array.from(logoFileIds) } })
        .select("_id storage_path")
        .lean();
      const signedById = new Map();
      await Promise.all(
        files.map(async (f) => {
          const url = await getSignedFileUrl(f.storage_path, 60);
          signedById.set(String(f._id), url);
        })
      );

      rows.forEach((row) => {
        const orgBranding = row.branding?.organization;
        const wsBranding = row.branding?.workspace;
        if (orgBranding?.logoFile) {
          orgBranding.logoUrl = signedById.get(String(orgBranding.logoFile)) || orgBranding.logoUrl || null;
        }
        if (wsBranding?.logoFile) {
          wsBranding.logoUrl = signedById.get(String(wsBranding.logoFile)) || wsBranding.logoUrl || null;
        }
        row.branding.effective = wsBranding || orgBranding || null;
      });
    }

    return rows;
  },

  createWorkspaceAsUser: async ({ userId, name, organizationId = null, organizationName = null }) => {
    let finalOrganizationId = organizationId;
    if (!finalOrganizationId) {
      const member = await OrganizationMember.findOne({ user: userId }).lean();
      if (member) {
        finalOrganizationId = member.organization;
      } else {
        const organization = await organizationService.createOrganization({
          name: organizationName || `${name} Organization`,
          createdBy: userId,
        });
        finalOrganizationId = organization._id;
      }
    }

    const workspace = await WorkspaceService.createWorkspaceForSignup({
      name,
      createdBy: userId,
      organizationId: finalOrganizationId,
    });

    await WorkspaceMember.create({
      user: userId,
      organization: finalOrganizationId,
      workspace: workspace._id,
      role: "Admin",
    });

    return workspace;
  },

  findMembership: async (userId, workspaceId) => {
    return WorkspaceMember.findOne({
      user: userId,
      workspace: workspaceId,
    }).lean();
  },

  getWorkspaceById: async (workspaceId) => {
    return Workspace.findById(workspaceId).lean();
  },

  addMember: async ({ userId, workspaceId, role, organizationId = null }) => {
    let orgId = organizationId;
    if (!orgId) {
      const workspace = await Workspace.findById(workspaceId).lean();
      orgId = workspace?.organization;
    }
    return WorkspaceMember.create({
      user: userId,
      workspace: workspaceId,
      organization: orgId,
      role: role || "Viewer",
    });
  },

  removeMember: async ({ userId, workspaceId }) => {
    return WorkspaceMember.findOneAndDelete({
      user: userId,
      workspace: workspaceId,
    });
  },

  countMembershipsForUser: async (userId) => {
    return WorkspaceMember.countDocuments({ user: userId });
  },

  updateMemberRole: async ({ userId, workspaceId, role }) => {
    return WorkspaceMember.findOneAndUpdate(
      { user: userId, workspace: workspaceId },
      { role },
      { new: true }
    );
  },

  getOrganizationRoleMapForUser: async (userId) => {
    const orgMemberships = await OrganizationMember.find({ user: userId }).lean();
    return new Map(orgMemberships.map((m) => [String(m.organization), m.role]));
  },

  enrichWithOrganizationRoles: async (userId, workspaces) => {
    const roleMap = await WorkspaceService.getOrganizationRoleMapForUser(userId);
    return workspaces.map((w) => ({
      ...w,
      organizationRole: w.organization?.organizationId
        ? roleMap.get(w.organization.organizationId) || null
        : null,
    }));
  },

  updateBranding: async (workspaceId, brandingPatch = {}) => {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return null;
    const next = { ...(workspace.branding?.toObject ? workspace.branding.toObject() : workspace.branding || {}) };
    for (const [key, val] of Object.entries(brandingPatch)) {
      if (typeof val !== "undefined") next[key] = val;
    }
    workspace.branding = next;
    await workspace.save();
    return workspace;
  },

  /**
   * Paginated users in a workspace (membership role on each row).
   */
  listMembersPaginated: async ({
    workspaceId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    role,
    search,
  }) => {
    const wsObjId =
      typeof workspaceId === "string" ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;
    const match = { workspace: wsObjId };
    if (role) match.role = role;

    const sortDir = sortOrder === "asc" ? 1 : -1;
    const userFieldSort = {
      fullName: "fullName",
      email: "email",
      username: "username",
    };

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "u",
        },
      },
      { $unwind: "$u" },
    ];

    if (search && String(search).trim()) {
      const re = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      pipeline.push({
        $match: {
          $or: [{ "u.fullName": re }, { "u.email": re }, { "u.username": re }],
        },
      });
    }

    let sortStage = {};
    if (sortBy === "role") sortStage = { role: sortDir };
    else if (userFieldSort[sortBy]) sortStage = { [`u.${userFieldSort[sortBy]}`]: sortDir };
    else if (["createdAt", "updatedAt"].includes(sortBy)) sortStage = { [sortBy]: sortDir };
    else sortStage = { createdAt: -1 };

    pipeline.push({ $sort: sortStage });

    const skip = (page - 1) * limit;
    pipeline.push({
      $facet: {
        rows: [{ $skip: skip }, { $limit: limit }],
        count: [{ $count: "total" }],
      },
    });

    const agg = await WorkspaceMember.aggregate(pipeline);
    const rows = agg[0]?.rows || [];
    const total = agg[0]?.count[0]?.total || 0;

    const userIds = rows.map((r) => r.u._id);
    if (userIds.length === 0) {
      return {
        items: [],
        pagination: buildPaginationMeta({ page, limit, total }),
      };
    }

    const users = await User.find({ _id: { $in: userIds } })
      .populate({
        path: "profile_picture",
        select: "url storage_path display_name",
      })
      .lean();

    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    const items = rows.map((row) => {
      const u = byId.get(row.u._id.toString());
      if (!u) return null;
      return { ...u, role: row.role };
    }).filter(Boolean);

    return {
      items,
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },
};

module.exports = WorkspaceService;
