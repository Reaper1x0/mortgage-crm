const { R4XX } = require("../Responses");

// roles = array of allowed roles
const hasRole = (roles = []) => {
  return async (req, res, next) => {
    try {
      // isAuth middleware must run before this, so req.user is already populated
      if (!req.user) {
        return R4XX(res, 401, "Unauthorized: user not found in request.");
      }

      // Normalize roles to array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      const userRole = req.userRole;

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
