const { R2XX, R4XX } = require("../Responses");
const { userService } = require("../services");
const { catchAsync } = require("../utils");
const { parsePagination } = require("../utils/pagination.utils");
const { sanitizers } = require("../sanitizers");

const UserController = {
  listUsers: catchAsync(async (req, res) => {
    const { page, limit, sort } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 10,
      maxLimit: 100,
      defaultSortBy: "createdAt",
      defaultSortOrder: "desc",
      allowedSortBy: ["createdAt", "updatedAt", "fullName", "email", "username", "role"],
    });

    // Build filter object
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.search) {
      filter.$or = [
        { fullName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { username: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const { items, pagination } = await userService.listUsers({
      page,
      limit,
      sort,
      filter,
    });

    return R2XX(res, "Users fetched successfully", 200, {
      users: items.map((user) => sanitizers.userSanitizer(user)),
      pagination,
    });
  }),

  getUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) return R4XX(res, 404, "User not found");

    return R2XX(res, "User fetched successfully", 200, {
      user: sanitizers.userSanitizer(user),
    });
  }),

  createUser: catchAsync(async (req, res) => {
    const { fullName, username, email, password, role } = req.body;

    // Check if email already exists
    const existingEmail = await userService.getUserByEmail(email);
    if (existingEmail) {
      return R4XX(res, 409, "Email already exists");
    }

    // Check if username already exists
    const existingUsername = await userService.getUserByUserName(username);
    if (existingUsername) {
      return R4XX(res, 409, "Username already exists");
    }

    const newUser = await userService.createUser({
      fullName,
      username,
      email,
      password,
      role: role || "Viewer",
    });

    return R2XX(res, "User created successfully", 201, {
      user: sanitizers.userSanitizer(newUser),
    });
  }),

  updateUser: catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = { ...req.body };

    const user = await userService.getUserById(id);
    if (!user) return R4XX(res, 404, "User not found");

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await userService.getUserByEmail(updateData.email);
      if (existingEmail) {
        return R4XX(res, 409, "Email already exists");
      }
    }

    // Check username uniqueness if username is being updated
    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await userService.getUserByUserName(updateData.username);
      if (existingUsername) {
        return R4XX(res, 409, "Username already exists");
      }
    }

    // Remove password from updateData if it's not provided or empty
    if (!updateData.password) {
      delete updateData.password;
    }

    const updatedUser = await userService.updateUserById(id, updateData);
    if (!updatedUser) return R4XX(res, 404, "User not found");

    return R2XX(res, "User updated successfully", 200, {
      user: sanitizers.userSanitizer(updatedUser),
    });
  }),

  deleteUser: catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await userService.getUserById(id);
    if (!user) return R4XX(res, 404, "User not found");

    // Prevent deleting yourself
    if (id === req.user) {
      return R4XX(res, 400, "You cannot delete your own account");
    }

    const deleted = await userService.deleteUserById(id);
    if (!deleted) return R4XX(res, 404, "User not found");

    return R2XX(res, "User deleted successfully", 200);
  }),
};

module.exports = UserController;

