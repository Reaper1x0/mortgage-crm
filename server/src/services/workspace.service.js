const mongoose = require("mongoose");
const { Workspace, WorkspaceMember, User, OrganizationMember, File, WorkspaceRole } = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");
const organizationService = require("./organization.service");
const { getSignedFileUrl } = require("../utils/fileUrl.utils");
const { ensureOrganizationRbac } = require("./rbacBootstrap.service");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/** Maps workspace role slug to legacy UI role strings used by the client router. */
function workspaceSlugToLegacyRole(slug) {
  const s = String(slug || "").toLowerCase();
  if (s === "admin" || s === "owner" || s === "full-access") return "Admin";
  if (s === "agent") return "Agent";
  return "Viewer";
}

async function buildWorkspaceRowFromWorkspaceDoc(wsDoc, roleSlug) {
  const org = wsDoc.organization;
  const row = {
    workspaceId: String(wsDoc._id),
    name: wsDoc.name,
    slug: wsDoc.slug,
    role: workspaceSlugToLegacyRole(roleSlug),
    workspaceRoleSlug: roleSlug || null,
    organization: org
      ? {
          organizationId: String(org._id || org),
          name: org.name,
          slug: org.slug,
        }
      : null,
    organizationRole: null,
    branding: {
      organization: org?.branding || null,
      workspace: wsDoc.branding || null,
      effective: wsDoc.branding || org?.branding || null,
    },
  };
  return row;
}

const WorkspaceService = {
  /**
   * Every organization owner gets an explicit WorkspaceMember row with the system full-access role.
   * Keeps workspace user lists and org "workspace access" UI consistent with implicit authz rules.
   */
  ensureOrgOwnersAreMembersOfWorkspace: async (workspaceId) => {
    const ws = await Workspace.findById(workspaceId).select("organization").lean();
    if (!ws?.organization) return;
    const orgId = ws.organization;
    await ensureOrganizationRbac(orgId);
    const fullAccess = await WorkspaceRole.findOne({
      organization: orgId,
      slug: "full-access",
      kind: "system",
    })
      .select("_id")
      .lean();
    if (!fullAccess?._id) return;
    const owners = await OrganizationMember.find({ organization: orgId, isOwner: true }).select("user").lean();
    await Promise.all(
      owners.map((m) =>
        WorkspaceMember.updateOne(
          { user: m.user, workspace: workspaceId, organization: orgId },
          {
            $set: {
              user: m.user,
              workspace: workspaceId,
              organization: orgId,
              workspaceRole: fullAccess._id,
            },
          },
          { upsert: true }
        )
      )
    );
  },

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

  listWorkspacesForUser: async (userId) => {
    const userObjectId = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

    const orgRows = await OrganizationMember.find({ user: userObjectId }).lean();
    const ownedOrgIds = orgRows.filter((m) => m.isOwner).map((m) => String(m.organization));

    const memberships = await WorkspaceMember.find({ user: userObjectId })
      .populate({
        path: "workspace",
        populate: { path: "organization" },
      })
      .populate({ path: "workspaceRole", select: "slug name" })
      .lean();

    const byWorkspaceId = new Map();

    for (const m of memberships) {
      if (!m.workspace) continue;
      const wid = String(m.workspace._id);
      const slug = m.workspaceRole?.slug || "viewer";
      byWorkspaceId.set(wid, { workspace: m.workspace, roleSlug: slug, source: "member" });
    }

    if (ownedOrgIds.length > 0) {
      const orgObjectIds = ownedOrgIds.map((id) => new mongoose.Types.ObjectId(id));
      const extraWorkspaces = await Workspace.find({ organization: { $in: orgObjectIds } })
        .populate({ path: "organization" })
        .lean();
      for (const ws of extraWorkspaces) {
        const wid = String(ws._id);
        if (!byWorkspaceId.has(wid)) {
          byWorkspaceId.set(wid, { workspace: ws, roleSlug: "owner", source: "org_owner" });
        }
      }
    }

    const rows = [];
    for (const [, entry] of byWorkspaceId) {
      const ws = entry.workspace;
      const row = await buildWorkspaceRowFromWorkspaceDoc(ws, entry.roleSlug);
      rows.push(row);
    }

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

    const { workspaceRoleIds } = await ensureOrganizationRbac(finalOrganizationId);
    const creatorWorkspaceRoleId =
      workspaceRoleIds?.fullAccess ||
      (
        await WorkspaceRole.findOne({
          organization: finalOrganizationId,
          slug: "full-access",
          kind: "system",
        })
          .select("_id")
          .lean()
      )?._id;
    if (!creatorWorkspaceRoleId) {
      throw new Error("Workspace roles are not bootstrapped for this organization.");
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
      workspaceRole: creatorWorkspaceRoleId,
    });

    await WorkspaceService.ensureOrgOwnersAreMembersOfWorkspace(workspace._id);

    return workspace;
  },

  findMembership: async (userId, workspaceId) => {
    return WorkspaceMember.findOne({
      user: userId,
      workspace: workspaceId,
    })
      .populate({ path: "workspaceRole", select: "slug name permissions" })
      .lean();
  },

  getWorkspaceById: async (workspaceId) => {
    return Workspace.findById(workspaceId).lean();
  },

  addMember: async ({ userId, workspaceId, workspaceRoleId, role, organizationId = null }) => {
    let orgId = organizationId;
    if (!orgId) {
      const workspace = await Workspace.findById(workspaceId).lean();
      orgId = workspace?.organization;
    }
    let resolvedRoleId = workspaceRoleId;
    if (!resolvedRoleId && role) {
      resolvedRoleId = await organizationService.resolveWorkspaceRoleId(orgId, role);
    }
    if (!resolvedRoleId) {
      resolvedRoleId = await organizationService.resolveWorkspaceRoleId(orgId, "viewer");
    }
    if (!resolvedRoleId) {
      resolvedRoleId = await organizationService.resolveWorkspaceRoleId(orgId, "full-access");
    }
    return WorkspaceMember.create({
      user: userId,
      workspace: workspaceId,
      organization: orgId,
      workspaceRole: resolvedRoleId,
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

  updateMemberRole: async ({ userId, workspaceId, workspaceRoleId, role }) => {
    let resolved = workspaceRoleId;
    if (!resolved && role) {
      const workspace = await Workspace.findById(workspaceId).select("organization").lean();
      if (workspace?.organization) {
        resolved = await organizationService.resolveWorkspaceRoleId(workspace.organization, role);
      }
    }
    if (!resolved) return null;
    return WorkspaceMember.findOneAndUpdate(
      { user: userId, workspace: workspaceId },
      { workspaceRole: resolved },
      { new: true }
    ).populate({ path: "workspaceRole", select: "slug name" });
  },

  getOrganizationRoleMapForUser: async (userId) => {
    const orgMemberships = await OrganizationMember.find({ user: userId })
      .populate({ path: "organizationRole", select: "slug" })
      .lean();
    return new Map(
      orgMemberships.map((m) => [
        String(m.organization),
        m.isOwner ? "owner" : m.organizationRole?.slug || null,
      ])
    );
  },

  enrichWithOrganizationRoles: async (userId, workspaces) => {
    const roleMap = await WorkspaceService.getOrganizationRoleMapForUser(userId);
    const formatOrgRoleForUi = (slug) => {
      if (!slug) return null;
      if (String(slug).toLowerCase() === "owner") return "Owner";
      const s = String(slug);
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    return workspaces.map((w) => ({
      ...w,
      organizationRole: w.organization?.organizationId
        ? formatOrgRoleForUi(roleMap.get(w.organization.organizationId))
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

  listMembersPaginated: async ({
    workspaceId,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    role,
    workspaceRoleId,
    search,
  }) => {
    await WorkspaceService.ensureOrgOwnersAreMembersOfWorkspace(workspaceId);

    const wsObjId =
      typeof workspaceId === "string" ? new mongoose.Types.ObjectId(workspaceId) : workspaceId;
    const match = { workspace: wsObjId };

    if (workspaceRoleId) {
      match.workspaceRole = workspaceRoleId;
    } else if (role) {
      const ws = await Workspace.findById(workspaceId).select("organization").lean();
      if (ws?.organization) {
        const slug = String(role).toLowerCase();
        const wr = await WorkspaceRole.findOne({ organization: ws.organization, slug }).select("_id").lean();
        if (wr) match.workspaceRole = wr._id;
      }
    }

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
      {
        $lookup: {
          from: "workspace_roles",
          localField: "workspaceRole",
          foreignField: "_id",
          as: "wsRole",
        },
      },
      { $unwind: "$wsRole" },
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
    if (sortBy === "role") sortStage = { "wsRole.slug": sortDir };
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

    const items = rows
      .map((row) => {
        const u = byId.get(row.u._id.toString());
        if (!u) return null;
        const slug = row.wsRole?.slug;
        return {
          ...u,
          role: row.wsRole?.name || "Role",
          workspaceRoleSlug: slug || null,
          workspaceRoleId: row.workspaceRole ? String(row.workspaceRole) : null,
        };
      })
      .filter(Boolean);

    return {
      items,
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },
};

module.exports = WorkspaceService;
