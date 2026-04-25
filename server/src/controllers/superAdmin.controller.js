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
      orgRole: req.query.orgRole,
      search: req.query.search,
    });

    const users = items.map((user) => sanitizers.userSanitizer(user));
    await attachSignedUrlsDeep(users);

    return R2XX(res, "System users fetched successfully", 200, {
      users,
      pagination,
    });
  }),
};

module.exports = SuperAdminController;
