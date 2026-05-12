const { R2XX } = require("../Responses");
const { superAdminService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const { sanitizers } = require("../sanitizers");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

const SuperAdminController = {
  getDashboard: catchAsync(async (req, res) => {
    const stats = await superAdminService.getDashboardStats();
    return R2XX(res, "Dashboard stats fetched successfully", 200, stats);
  }),

  listSystemUsers: catchAsync(async (req, res) => {
    const { page, limit, sortBy, sortOrder } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "fullName", "email", "username", "role"],
    });

    const { items, pagination } = await superAdminService.listSystemUsers({
      page,
      limit,
      sortBy,
      sortOrder,
      role: req.query.role,
      search: req.query.search,
    });

    const users = items.map((user) => sanitizers.userSanitizer(user));
    await attachSignedUrlsDeep(users);

    return R2XX(res, "System users fetched successfully", 200, {
      users,
      pagination,
    });
  }),

  listOrganizations: catchAsync(async (req, res) => {
    const { page, limit } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "updatedAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["updatedAt"],
    });

    const { items, summary, pagination } = await superAdminService.listOrganizations({
      page,
      limit,
      search: req.query.search,
      subscriptionStatus: req.query.subscriptionStatus,
    });

    return R2XX(res, "Organizations fetched successfully", 200, {
      organizations: items,
      summary,
      pagination,
    });
  }),

  listWorkspaces: catchAsync(async (req, res) => {
    const { page, limit } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "updatedAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["updatedAt"],
    });

    const { items, summary, pagination } = await superAdminService.listWorkspaces({
      page,
      limit,
      search: req.query.search,
      subscriptionStatus: req.query.subscriptionStatus,
    });

    return R2XX(res, "Workspaces fetched successfully", 200, {
      workspaces: items,
      summary,
      pagination,
    });
  }),

  getOrganizationDetails: catchAsync(async (req, res) => {
    const organization = await superAdminService.getOrganizationDetails(req.params.organizationId);

    await attachSignedUrlsDeep(organization);

    return R2XX(res, "Organization details fetched successfully", 200, {
      organization,
    });
  }),

  getWorkspaceDetails: catchAsync(async (req, res) => {
    const workspace = await superAdminService.getWorkspaceDetails(req.params.workspaceId);

    await attachSignedUrlsDeep(workspace);

    return R2XX(res, "Workspace details fetched successfully", 200, {
      workspace,
    });
  }),
};

module.exports = SuperAdminController;
