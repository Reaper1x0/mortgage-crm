const mongoose = require("mongoose");
const { Workspace, WorkspaceMember, User } = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const WorkspaceService = {
  createWorkspaceForSignup: async ({ name, createdBy = null }) => {
    const base = slugify(name) || "workspace";
    let slug = base;
    let counter = 1;

    while (await Workspace.findOne({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }

    return Workspace.create({
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
      .populate("workspace")
      .lean();

    return memberships
      .filter((m) => m.workspace)
      .map((m) => ({
        workspaceId: String(m.workspace._id),
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      }));
  },

  createWorkspaceAsUser: async ({ userId, name }) => {
    const workspace = await WorkspaceService.createWorkspaceForSignup({
      name,
      createdBy: userId,
    });

    await WorkspaceMember.create({
      user: userId,
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

  addMember: async ({ userId, workspaceId, role }) => {
    return WorkspaceMember.create({
      user: userId,
      workspace: workspaceId,
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
