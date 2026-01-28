const { R4XX } = require("../Responses");
const { userService } = require("../services");

// roles = array of allowed roles
const hasRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      // isAuth middleware must run before this, so req.user is already populated
      if (!req.user) {
        return R4XX(res, 401, "Unauthorized: user not found in request.");
      }

      const user = await userService.getUserById(req.user);
      if (!user) {
        return R4XX(res, 401, "Unauthorized: user not found in request.");
      }

      // Normalize roles to array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      const userRole = user.role;

      // Check if user's role is in the allowed roles array
      const hasPermission = allowedRoles.includes(userRole);

      if (!hasPermission) {
        return R4XX(res, 403, "Forbidden: insufficient permissions.");
      }

      next();
    } catch (err) {
      return R4XX(res, 500, "Server error during role validation.");
    }
  };
};

module.exports = hasRole;
