const {
  User,
  WorkspaceMember,
  OrganizationMember,
  Organization,
  Workspace,
  OrganizationSubscription,
  Plan,
} = require("../models");
const { buildPaginationMeta } = require("../utils/pagination.utils");
const { getStripe } = require("../billing/stripe.service");
const mongoose = require("mongoose");

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

    const [
      systemRoleBreakdown,
      workspaceRoleBreakdown,
      organizationRoleBreakdown,
      rawSignups,
      subscriptionStatusBreakdown,
      subscriptions,
      plans,
    ] =
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
        OrganizationSubscription.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        OrganizationSubscription.find({}).select("status stripePriceId billingCycle").lean(),
        Plan.find({}).select("name code stripeMonthlyPriceId stripeYearlyPriceId").lean(),
      ]);

    const signupByDay = new Map(rawSignups.map((row) => [row._id, row.count]));
    const signupsLast14Days = [];
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      signupsLast14Days.push({ date: key, count: signupByDay.get(key) || 0 });
    }

    let estimatedRevenue = {
      mrr: 0,
      arr: 0,
      currency: "USD",
      byPlan: [],
      byCycle: [],
      estimatedFromSubscriptions: 0,
      estimateAvailable: false,
    };
    try {
      const stripe = getStripe();
      const activeLike = new Set(["active", "trialing", "past_due"]);
      const billableSubs = subscriptions.filter(
        (s) => activeLike.has(String(s.status || "").toLowerCase()) && s.stripePriceId
      );
      const uniquePriceIds = [...new Set(billableSubs.map((s) => s.stripePriceId).filter(Boolean))];
      const priceMap = new Map();
      await Promise.all(
        uniquePriceIds.map(async (priceId) => {
          const p = await stripe.prices.retrieve(String(priceId));
          priceMap.set(String(priceId), p);
        })
      );

      const planByPriceId = new Map();
      for (const plan of plans) {
        if (plan.stripeMonthlyPriceId) planByPriceId.set(String(plan.stripeMonthlyPriceId), plan);
        if (plan.stripeYearlyPriceId) planByPriceId.set(String(plan.stripeYearlyPriceId), plan);
      }

      const cycleRevenue = new Map();
      const planRevenue = new Map();
      let totalMrrCents = 0;
      let currency = "USD";

      for (const sub of billableSubs) {
        const price = priceMap.get(String(sub.stripePriceId));
        if (!price || typeof price.unit_amount !== "number") continue;
        currency = String(price.currency || "usd").toUpperCase();
        const interval = price.recurring?.interval;
        const intervalCount = price.recurring?.interval_count || 1;
        let monthlyCents = 0;
        if (interval === "month") monthlyCents = Math.round(price.unit_amount / intervalCount);
        else if (interval === "year") monthlyCents = Math.round(price.unit_amount / (12 * intervalCount));
        else continue;

        totalMrrCents += monthlyCents;
        const cycleKey = String(sub.billingCycle || interval || "monthly");
        cycleRevenue.set(cycleKey, (cycleRevenue.get(cycleKey) || 0) + monthlyCents);

        const plan = planByPriceId.get(String(sub.stripePriceId));
        const planKey = plan?.code || "unknown";
        const planLabel = plan?.name || "Unknown";
        const current = planRevenue.get(planKey) || { code: planKey, name: planLabel, mrrCents: 0, subscriptions: 0 };
        current.mrrCents += monthlyCents;
        current.subscriptions += 1;
        planRevenue.set(planKey, current);
      }

      estimatedRevenue = {
        mrr: totalMrrCents / 100,
        arr: (totalMrrCents * 12) / 100,
        currency,
        estimatedFromSubscriptions: billableSubs.length,
        estimateAvailable: true,
        byPlan: [...planRevenue.values()]
          .sort((a, b) => b.mrrCents - a.mrrCents)
          .map((p) => ({ ...p, mrr: p.mrrCents / 100 })),
        byCycle: [...cycleRevenue.entries()].map(([cycle, mrrCents]) => ({
          cycle,
          mrr: mrrCents / 100,
        })),
      };
    } catch (_err) {
      // Stripe may be unavailable in local env; dashboard should still load.
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
      subscriptionStatusBreakdown: subscriptionStatusBreakdown.map((r) => ({
        status: r._id || "unknown",
        count: r.count,
      })),
      estimatedRevenue,
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

  listOrganizations: async ({ page = 1, limit = 10, search, subscriptionStatus }) => {
    const match = {};
    if (search && String(search).trim()) {
      const re = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ name: re }, { slug: re }, { legalName: re }, { contactEmail: re }];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "organizationsubscriptions",
          localField: "_id",
          foreignField: "organization",
          as: "subscription",
        },
      },
      { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },
    ];

    if (subscriptionStatus) {
      if (subscriptionStatus === "none") {
        pipeline.push({ $match: { subscription: { $eq: null } } });
      } else {
        pipeline.push({ $match: { "subscription.status": subscriptionStatus } });
      }
    }

    pipeline.push(
      {
        $lookup: {
          from: "workspaces",
          localField: "_id",
          foreignField: "organization",
          as: "workspaces",
        },
      },
      {
        $lookup: {
          from: "organization_members",
          localField: "_id",
          foreignField: "organization",
          as: "orgMembers",
        },
      },
      {
        $lookup: {
          from: "workspace_members",
          localField: "_id",
          foreignField: "organization",
          as: "workspaceMembers",
        },
      },
      {
        $addFields: {
          workspaceCount: { $size: "$workspaces" },
          orgMemberCount: { $size: "$orgMembers" },
          workspaceSeatCount: { $size: "$workspaceMembers" },
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $facet: {
          rows: [
            { $skip: Math.max(0, (Number(page) - 1) * Number(limit)) },
            { $limit: Math.max(1, Number(limit) || 10) },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                legalName: 1,
                website: 1,
                industry: 1,
                size: 1,
                contactEmail: 1,
                createdAt: 1,
                updatedAt: 1,
                workspaceCount: 1,
                orgMemberCount: 1,
                workspaceSeatCount: 1,
                subscription: {
                  _id: "$subscription._id",
                  status: "$subscription.status",
                  billingCycle: "$subscription.billingCycle",
                  cancelAtPeriodEnd: "$subscription.cancelAtPeriodEnd",
                  currentPeriodEnd: "$subscription.currentPeriodEnd",
                  planSnapshot: "$subscription.planSnapshot",
                  stripeSubscriptionId: "$subscription.stripeSubscriptionId",
                },
              },
            },
          ],
          total: [{ $count: "count" }],
          summary: [
            {
              $group: {
                _id: null,
                totalOrganizations: { $sum: 1 },
                totalWorkspaces: { $sum: "$workspaceCount" },
                totalOrgMembers: { $sum: "$orgMemberCount" },
                totalWorkspaceSeats: { $sum: "$workspaceSeatCount" },
                activeSubscriptions: {
                  $sum: { $cond: [{ $eq: ["$subscription.status", "active"] }, 1, 0] },
                },
                trialingSubscriptions: {
                  $sum: { $cond: [{ $eq: ["$subscription.status", "trialing"] }, 1, 0] },
                },
                pastDueOrIncomplete: {
                  $sum: {
                    $cond: [
                      { $in: ["$subscription.status", ["past_due", "incomplete", "incomplete_expired", "unpaid"]] },
                      1,
                      0,
                    ],
                  },
                },
                noSubscription: {
                  $sum: { $cond: [{ $eq: ["$subscription", null] }, 1, 0] },
                },
              },
            },
          ],
        },
      }
    );

    const [agg] = await Organization.aggregate(pipeline);
    const rows = agg?.rows || [];
    const total = agg?.total?.[0]?.count || 0;
    const summary = agg?.summary?.[0] || {
      totalOrganizations: 0,
      totalWorkspaces: 0,
      totalOrgMembers: 0,
      totalWorkspaceSeats: 0,
      activeSubscriptions: 0,
      trialingSubscriptions: 0,
      pastDueOrIncomplete: 0,
      noSubscription: 0,
    };

    return {
      items: rows,
      summary: {
        ...summary,
        avgWorkspacesPerOrganization:
          summary.totalOrganizations > 0
            ? Math.round((summary.totalWorkspaces / summary.totalOrganizations) * 100) / 100
            : 0,
      },
      pagination: buildPaginationMeta({ page: Number(page) || 1, limit: Math.max(1, Number(limit) || 10), total }),
    };
  },

  listWorkspaces: async ({ page = 1, limit = 10, search, role, subscriptionStatus }) => {
    const match = {};
    if (search && String(search).trim()) {
      const re = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [{ name: re }, { slug: re }];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "organizations",
          localField: "organization",
          foreignField: "_id",
          as: "organization",
        },
      },
      { $unwind: { path: "$organization", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "organizationsubscriptions",
          localField: "organization._id",
          foreignField: "organization",
          as: "subscription",
        },
      },
      { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "workspace_members",
          localField: "_id",
          foreignField: "workspace",
          as: "members",
        },
      },
      {
        $addFields: {
          memberCount: { $size: "$members" },
          adminCount: {
            $size: {
              $filter: {
                input: "$members",
                as: "m",
                cond: { $eq: ["$$m.role", "Admin"] },
              },
            },
          },
        },
      },
    ];

    if (role) {
      pipeline.push({
        $match: {
          members: {
            $elemMatch: { role },
          },
        },
      });
    }
    if (subscriptionStatus) {
      if (subscriptionStatus === "none") pipeline.push({ $match: { subscription: { $eq: null } } });
      else pipeline.push({ $match: { "subscription.status": subscriptionStatus } });
    }

    pipeline.push(
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          rows: [
            { $skip: Math.max(0, (Number(page) - 1) * Number(limit)) },
            { $limit: Math.max(1, Number(limit) || 10) },
            {
              $project: {
                _id: 1,
                name: 1,
                slug: 1,
                createdAt: 1,
                updatedAt: 1,
                memberCount: 1,
                adminCount: 1,
                organization: {
                  _id: "$organization._id",
                  name: "$organization.name",
                  slug: "$organization.slug",
                },
                subscription: {
                  status: "$subscription.status",
                  billingCycle: "$subscription.billingCycle",
                  currentPeriodEnd: "$subscription.currentPeriodEnd",
                  cancelAtPeriodEnd: "$subscription.cancelAtPeriodEnd",
                },
              },
            },
          ],
          total: [{ $count: "count" }],
          summary: [
            {
              $group: {
                _id: null,
                totalWorkspaces: { $sum: 1 },
                totalWorkspaceMembers: { $sum: "$memberCount" },
                totalWorkspaceAdmins: { $sum: "$adminCount" },
                activeSubscriptionWorkspaces: {
                  $sum: { $cond: [{ $eq: ["$subscription.status", "active"] }, 1, 0] },
                },
                atRiskSubscriptionWorkspaces: {
                  $sum: {
                    $cond: [
                      { $in: ["$subscription.status", ["past_due", "incomplete", "incomplete_expired", "unpaid"]] },
                      1,
                      0,
                    ],
                  },
                },
                noSubscriptionWorkspaces: { $sum: { $cond: [{ $eq: ["$subscription", null] }, 1, 0] } },
              },
            },
          ],
        },
      }
    );

    const [agg] = await Workspace.aggregate(pipeline);
    const rows = agg?.rows || [];
    const total = agg?.total?.[0]?.count || 0;
    const summary = agg?.summary?.[0] || {
      totalWorkspaces: 0,
      totalWorkspaceMembers: 0,
      totalWorkspaceAdmins: 0,
      activeSubscriptionWorkspaces: 0,
      atRiskSubscriptionWorkspaces: 0,
      noSubscriptionWorkspaces: 0,
    };

    return {
      items: rows,
      summary: {
        ...summary,
        avgMembersPerWorkspace:
          summary.totalWorkspaces > 0
            ? Math.round((summary.totalWorkspaceMembers / summary.totalWorkspaces) * 100) / 100
            : 0,
      },
      pagination: buildPaginationMeta({ page: Number(page) || 1, limit: Math.max(1, Number(limit) || 10), total }),
    };
  },

  getOrganizationDetails: async (organizationId) => {
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      const err = new Error("Invalid organization id");
      err.statusCode = 400;
      throw err;
    }

    const organization = await Organization.findById(organizationId)
      .populate({
        path: "createdBy",
        select: "fullName email username role isEmailVerified profile_picture",
        populate: { path: "profile_picture" },
      })
      .lean();

    if (!organization) {
      const err = new Error("Organization not found");
      err.statusCode = 404;
      throw err;
    }

    const orgObjectId = organization._id;

    const [
      subscription,
      workspaceCount,
      orgMemberCount,
      workspaceSeatCount,
      organizationRoleBreakdown,
      workspaceRoleBreakdown,
      recentWorkspaces,
      membersPreview,
    ] = await Promise.all([
      OrganizationSubscription.findOne({ organization: orgObjectId })
        .populate({
          path: "plan",
          select:
            "name code description displayOrder active visible recommended trialDays entitlements stripeMonthlyPriceId stripeYearlyPriceId",
        })
        .lean(),

      Workspace.countDocuments({ organization: orgObjectId }),

      OrganizationMember.countDocuments({ organization: orgObjectId }),

      WorkspaceMember.countDocuments({ organization: orgObjectId }),

      OrganizationMember.aggregate([
        { $match: { organization: orgObjectId } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      WorkspaceMember.aggregate([
        { $match: { organization: orgObjectId } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Workspace.aggregate([
        { $match: { organization: orgObjectId } },
        {
          $lookup: {
            from: "workspace_members",
            localField: "_id",
            foreignField: "workspace",
            as: "members",
          },
        },
        {
          $addFields: {
            memberCount: { $size: "$members" },
            adminCount: {
              $size: {
                $filter: {
                  input: "$members",
                  as: "m",
                  cond: { $eq: ["$$m.role", "Admin"] },
                },
              },
            },
          },
        },
        { $sort: { updatedAt: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            name: 1,
            slug: 1,
            createdAt: 1,
            updatedAt: 1,
            memberCount: 1,
            adminCount: 1,
          },
        },
      ]),

      OrganizationMember.find({ organization: orgObjectId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: "user",
          select: "fullName email username role isEmailVerified profile_picture",
          populate: { path: "profile_picture" },
        })
        .lean(),
    ]);

    return {
      ...organization,
      subscription: subscription
        ? {
            _id: subscription._id,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            stripeCustomerId: subscription.stripeCustomerId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripePriceId: subscription.stripePriceId,
            trialStart: subscription.trialStart,
            trialEnd: subscription.trialEnd,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            lastSyncedAt: subscription.lastSyncedAt,
            planSnapshot: subscription.planSnapshot,
            plan: subscription.plan || null,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          }
        : null,
      counts: {
        workspaces: workspaceCount,
        organizationMembers: orgMemberCount,
        workspaceSeats: workspaceSeatCount,
      },
      roleBreakdown: {
        organization: organizationRoleBreakdown.map((r) => ({
          role: r._id || "unknown",
          count: r.count,
        })),
        workspace: workspaceRoleBreakdown.map((r) => ({
          role: r._id || "unknown",
          count: r.count,
        })),
      },
      recentWorkspaces,
      membersPreview,
    };
  },

  getWorkspaceDetails: async (workspaceId) => {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      const err = new Error("Invalid workspace id");
      err.statusCode = 400;
      throw err;
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate({
        path: "organization",
        select: "name slug legalName website industry size contactEmail phone settings branding",
      })
      .populate({
        path: "createdBy",
        select: "fullName email username role isEmailVerified profile_picture",
        populate: { path: "profile_picture" },
      })
      .lean();

    if (!workspace) {
      const err = new Error("Workspace not found");
      err.statusCode = 404;
      throw err;
    }

    const workspaceObjectId = workspace._id;
    const organizationId = workspace.organization?._id || workspace.organization;

    const [
      subscription,
      memberCount,
      roleBreakdown,
      membersPreview,
      organizationWorkspaceCount,
      organizationMemberCount,
    ] = await Promise.all([
      organizationId
        ? OrganizationSubscription.findOne({ organization: organizationId })
            .populate({
              path: "plan",
              select:
                "name code description displayOrder active visible recommended trialDays entitlements stripeMonthlyPriceId stripeYearlyPriceId",
            })
            .lean()
        : null,

      WorkspaceMember.countDocuments({ workspace: workspaceObjectId }),

      WorkspaceMember.aggregate([
        { $match: { workspace: workspaceObjectId } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      WorkspaceMember.find({ workspace: workspaceObjectId })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate({
          path: "user",
          select: "fullName email username role isEmailVerified profile_picture",
          populate: { path: "profile_picture" },
        })
        .lean(),

      organizationId ? Workspace.countDocuments({ organization: organizationId }) : 0,

      organizationId ? OrganizationMember.countDocuments({ organization: organizationId }) : 0,
    ]);

    return {
      ...workspace,
      subscription: subscription
        ? {
            _id: subscription._id,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            stripeCustomerId: subscription.stripeCustomerId,
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            stripePriceId: subscription.stripePriceId,
            trialStart: subscription.trialStart,
            trialEnd: subscription.trialEnd,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            lastSyncedAt: subscription.lastSyncedAt,
            planSnapshot: subscription.planSnapshot,
            plan: subscription.plan || null,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
          }
        : null,
      counts: {
        members: memberCount,
        organizationWorkspaces: organizationWorkspaceCount,
        organizationMembers: organizationMemberCount,
      },
      roleBreakdown: roleBreakdown.map((r) => ({
        role: r._id || "unknown",
        count: r.count,
      })),
      membersPreview,
    };
  },
};

module.exports = SuperAdminService;
