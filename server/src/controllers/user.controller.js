const { R2XX, R4XX } = require("../Responses");
const { userService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const { sanitizers } = require("../sanitizers");
const { attachSignedUrlsDeep } = require("../utils/fileUrl.utils");

const UserController = {
  listUsers: catchAsync(async (req, res) => {
    const workspaceId = req.workspaceId;
    const { page, limit, sortBy, sortOrder } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "fullName", "email", "username", "role"],
    });

    const { items, pagination } = await userService.listUsers({
      workspaceId,
      page,
      limit,
      sortBy,
      sortOrder,
      role: req.query.role,
      workspaceRoleId: req.query.workspaceRoleId,
      search: req.query.search,
    });

    const users = items.map((user) => sanitizers.userSanitizer(user));
    await attachSignedUrlsDeep(users);

    return R2XX(res, "Users fetched successfully", 200, {
      users,
      pagination,
    });
  }),

  getUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const bundle = await userService.getUserInWorkspace(id, req.workspaceId);
    if (!bundle) return R4XX(res, 404, "User not found");

    const u = bundle.user.toObject ? bundle.user.toObject() : bundle.user;
    u.role = bundle.workspaceRole;

    const sanitizedUser = sanitizers.userSanitizer(u);
    await attachSignedUrlsDeep(sanitizedUser);
    return R2XX(res, "User fetched successfully", 200, { user: sanitizedUser });
  }),
};

module.exports = UserController;
