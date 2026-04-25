const { User, WorkspaceMember, OrganizationMember, Organization, Workspace } = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");

const orgRolePriority = {
  Owner: 4,
  Admin: 3,
  Member: 2,
  Viewer: 1,
};

const SuperAdminService = {
  /**
   * High-level counts and breakdowns for the system admin dashboard.
   */
  getDashboardStats: async () => {
    const [
      totalUsers,
      superAdminUsers,
      verifiedUsers,
      totalOrganizations,
      totalWorkspaces,
      totalOrgMemberships,
      totalWorkspaceMemberships,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "superAdmin" }),
      User.countDocuments({ isEmailVerified: true }),
      Organization.countDocuments(),
      Workspace.countDocuments(),
      OrganizationMember.countDocuments(),
      WorkspaceMember.countDocuments(),
    ]);

    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - 13);

    const [systemRoleBreakdown, workspaceRoleBreakdown, organizationRoleBreakdown, rawSignups] =
      await Promise.all([
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        WorkspaceMember.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        OrganizationMember.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: periodStart },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const signupByDay = new Map(rawSignups.map((row) => [row._id, row.count]));
    const signupsLast14Days = [];
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      signupsLast14Days.push({ date: key, count: signupByDay.get(key) || 0 });
    }

    return {
      summary: {
        totalUsers,
        superAdminUsers,
        regularUsers: Math.max(0, totalUsers - superAdminUsers),
        verifiedUsers,
        unverifiedUsers: Math.max(0, totalUsers - verifiedUsers),
        totalOrganizations,
        totalWorkspaces,
        organizationMemberships: totalOrgMemberships,
        workspaceMemberships: totalWorkspaceMemberships,
        avgWorkspacesPerUser:
          totalUsers > 0
            ? Math.round((totalWorkspaceMemberships / totalUsers) * 100) / 100
            : 0,
        avgOrgsPerUser:
          totalUsers > 0 ? Math.round((totalOrgMemberships / totalUsers) * 100) / 100 : 0,
      },
      systemRoleBreakdown: systemRoleBreakdown.map((r) => ({
        role: r._id || "unknown",
        count: r.count,
      })),
      workspaceRoleBreakdown: workspaceRoleBreakdown.map((r) => ({
        role: r._id || "unknown",
        count: r.count,
      })),
      organizationRoleBreakdown: organizationRoleBreakdown.map((r) => ({
        role: r._id || "unknown",
        count: r.count,
      })),
      signupsLast14Days,
    };
  },

  listSystemUsers: async ({
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    role,
    orgRole,
    search,
  }) => {
    const sortDir = sortOrder === "asc" ? 1 : -1;
    const safeSortBy = ["createdAt", "updatedAt", "fullName", "email", "username", "role"].includes(sortBy)
      ? sortBy
      : "createdAt";

    const filter = {};
    if (role) filter.role = role;
    if (orgRole) {
      const orgMembers = await OrganizationMember.find({ role: orgRole })
        .select("user")
        .lean();
      const allowedUserIds = [...new Set(orgMembers.map((m) => String(m.user)))];
      if (allowedUserIds.length === 0) {
        return {
          items: [],
          pagination: buildPaginationMeta({ page, limit, total: 0 }),
        };
      }
      filter._id = { $in: allowedUserIds };
    }
    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ fullName: regex }, { email: regex }, { username: regex }];
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filter);

    const users = await User.find(filter)
      .sort({ [safeSortBy]: sortDir })
      .skip(skip)
      .limit(limit)
      .populate("profile_picture")
      .lean();

    const userIds = users.map((u) => u._id);
    if (userIds.length === 0) {
      return {
        items: [],
        pagination: buildPaginationMeta({ page, limit, total }),
      };
    }

    const workspaceCounts = await WorkspaceMember.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const orgCounts = await OrganizationMember.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const orgMemberships = await OrganizationMember.find({ user: { $in: userIds } })
      .select("user role")
      .lean();

    const workspaceCountByUserId = new Map(workspaceCounts.map((row) => [String(row._id), row.count]));
    const orgCountByUserId = new Map(orgCounts.map((row) => [String(row._id), row.count]));
    const primaryOrgRoleByUserId = new Map();
    orgMemberships.forEach((m) => {
      const key = String(m.user);
      const current = primaryOrgRoleByUserId.get(key);
      const currentScore = current ? orgRolePriority[current] || 0 : 0;
      const nextScore = orgRolePriority[m.role] || 0;
      if (!current || nextScore > currentScore) {
        primaryOrgRoleByUserId.set(key, m.role);
      }
    });

    const items = users.map((u) => ({
      ...u,
      workspaceCount: workspaceCountByUserId.get(String(u._id)) || 0,
      organizationCount: orgCountByUserId.get(String(u._id)) || 0,
      primaryOrganizationRole: primaryOrgRoleByUserId.get(String(u._id)) || null,
    }));

    return {
      items,
      pagination: buildPaginationMeta({ page, limit, total }),
    };
  },
};

module.exports = SuperAdminService;
