const { R4XX } = require("../Responses");
const { userService } = require("../services");

// roles = array of allowed roles
const hasRole = (roles = []) => {
  return async (req, res, next) => {
    try {
        console.log(req.user)
      // isAuth middleware must run before this, so req.user is already populated
      const user = await userService.getUserById(req.user);
      console.log(user.role)
      if (!user)
        return R4XX(res, 401, "Unauthorized: user not found in request.");

      // if user.role is a single value: 'admin'
      // or an array: ['admin', 'editor']
      const userRoles = Array.isArray(user.role)
        ? user.role
        : [user.role];

      // Check intersection between allowed roles and user roles
      const hasPermission = roles.some(r => userRoles.includes(r));

      if (!hasPermission)
        return R4XX(res, 403, "Forbidden: insufficient permissions.");

      next();
    } catch (err) {
      return R4XX(res, 500, `Server error during role validation.`);
    }
  };
};

module.exports = hasRole;
