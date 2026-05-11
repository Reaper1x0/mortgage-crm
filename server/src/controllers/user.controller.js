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
      search: req.query.search,
    });

    const users = items.map((user) => sanitizers.userSanitizer(user));
    await attachSignedUrlsDeep(users);
    const roleStats = await userService.getWorkspaceRoleStats(workspaceId);
    const permissions = {
      canManageUsers: userService.canManageWorkspaceUsers({
        orgRole: req.orgRole,
        workspaceRole: req.workspaceRole,
      }),
      canManageAdmins: req.orgRole === "Owner" || req.orgRole === "Admin",
    };

    return R2XX(res, "Users fetched successfully", 200, {
      users,
      roleStats,
      permissions,
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

  createUser: catchAsync(async (req, res) => {
    const { fullName, username, email, password, role } = req.body;

    const result = await userService.createUserInWorkspace({
      fullName,
      username,
      email,
      password,
      role: role || "Viewer",
      workspaceId: req.workspaceId,
    });

    if (!result.ok) {
      if (result.code === "WORKSPACE_NOT_FOUND") {
        return R4XX(res, 404, "Workspace not found.");
      }
      if (result.code === "ALREADY_IN_WORKSPACE") {
        return R4XX(res, 409, "This user is already a member of this workspace.");
      }
      if (result.code === "USERNAME_TAKEN") {
        return R4XX(res, 409, "Username already exists.");
      }
      if (result.code === "PLAN_LIMIT_REACHED" && result.limitError) {
        const status = result.limitError.code === "FEATURE_NOT_AVAILABLE" ? 403 : 429;
        const feature = result.limitError.feature || "resource";
        const reason =
          result.limitError.code === "FEATURE_NOT_AVAILABLE"
            ? `${feature} is not available in your current plan.`
            : `${feature} limit reached for your current plan.`;
        return R4XX(res, status, reason, result.limitError);
      }
      return R4XX(res, 400, "Unable to create user.");
    }

    const bundle = await userService.getUserInWorkspace(result.user._id, req.workspaceId);
    const u = bundle.user.toObject ? bundle.user.toObject() : bundle.user;
    u.role = bundle.workspaceRole;

    const sanitizedUser = sanitizers.userSanitizer(u);
    await attachSignedUrlsDeep(sanitizedUser);
    return R2XX(res, "User created successfully", 201, { user: sanitizedUser });
  }),

  updateUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    const bundle = await userService.getUserInWorkspace(id, req.workspaceId);
    if (!bundle) return R4XX(res, 404, "User not found");
    const user = bundle.user;
    const targetWorkspaceRole = bundle.workspaceRole;
    const nextWorkspaceRole = updateData.role || targetWorkspaceRole;
    const roleStats = await userService.getWorkspaceRoleStats(req.workspaceId);
    const policy = userService.validateWorkspaceRoleUpdatePolicy({
      actorOrgRole: req.orgRole,
      actorWorkspaceRole: req.workspaceRole,
      actorUserId: req.user,
      targetUserId: id,
      targetRole: targetWorkspaceRole,
      nextRole: nextWorkspaceRole,
      roleStats,
    });
    if (!policy.ok) return R4XX(res, policy.status || 400, policy.message || "Role update is not allowed.");

    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await userService.getUserByEmail(updateData.email);
      if (existingEmail) {
        return R4XX(res, 409, "Email already exists");
      }
    }

    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await userService.getUserByUserName(updateData.username);
      if (existingUsername) {
        return R4XX(res, 409, "Username already exists");
      }
    }

    if (!updateData.password) {
      delete updateData.password;
    }

    const updatedUser = await userService.updateUserById(id, updateData, req.workspaceId);
    if (!updatedUser) return R4XX(res, 404, "User not found");

    const sanitizedUser = sanitizers.userSanitizer(updatedUser);
    await attachSignedUrlsDeep(sanitizedUser);
    return R2XX(res, "User updated successfully", 200, { user: sanitizedUser });
  }),

  deleteUser: catchAsync(async (req, res) => {
    const { id } = req.params;

    const bundle = await userService.getUserInWorkspace(id, req.workspaceId);
    if (!bundle) return R4XX(res, 404, "User not found");
    const roleStats = await userService.getWorkspaceRoleStats(req.workspaceId);
    const policy = userService.validateWorkspaceRemovalPolicy({
      actorOrgRole: req.orgRole,
      actorWorkspaceRole: req.workspaceRole,
      actorUserId: req.user,
      targetUserId: id,
      targetRole: bundle.workspaceRole,
      roleStats,
    });
    if (!policy.ok) return R4XX(res, policy.status || 400, policy.message || "User removal is not allowed.");

    const deleted = await userService.deleteUserById(id, req.workspaceId);
    if (!deleted) return R4XX(res, 404, "User not found");

    return R2XX(res, "User deleted successfully", 200);
  }),
};

module.exports = UserController;
