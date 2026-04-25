const { R4XX } = require("../Responses");

const normalize = (config) => {
  if (Array.isArray(config) || typeof config === "string") {
    return { scope: "workspace", roles: Array.isArray(config) ? config : [config] };
  }
  return {
    scope: config?.scope || "workspace",
    roles: Array.isArray(config?.roles) ? config.roles : [],
  };
};

const hasRole = (config = []) => {
  const { roles, scope } = normalize(config);
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return R4XX(res, 401, "Unauthorized: user not found in request.");
      }

      const userRole = scope === "organization" ? req.orgRole : req.workspaceRole || req.userRole;
      const requiresContextRole = scope === "organization" ? !req.orgRole : !req.workspaceRole;

      if (requiresContextRole) {
        return R4XX(
          res,
          403,
          `Forbidden: ${scope} context role is missing. Ensure context middleware runs before hasRole.`
        );
      }

      const hasPermission = roles.includes(userRole);

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
