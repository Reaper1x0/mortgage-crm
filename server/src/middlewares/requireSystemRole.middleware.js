const { R4XX } = require("../Responses");

const requireSystemRole = (roles = []) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    const user = req.authUser;
    if (!user) {
      return R4XX(res, 401, "Unauthorized: user not found in request.");
    }

    if (!allowedRoles.includes(user.role)) {
      return R4XX(res, 403, "Forbidden: insufficient system permissions.");
    }

    return next();
  };
};

module.exports = requireSystemRole;
