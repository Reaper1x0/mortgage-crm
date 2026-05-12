const { R4XX } = require("../Responses");
const authorizationService = require("../services/authorization.service");

const requireWorkspaceUserManager = async (req, res, next) => {
  try {
    const canManage = authorizationService.canManageWorkspaceUsers({
      orgPerms: req.orgPermissions,
      wsPerms: req.workspacePermissions,
    });
    if (!canManage) {
      return R4XX(res, 403, "You do not have permission to manage workspace users.");
    }
    return next();
  } catch (_error) {
    return R4XX(res, 500, "Workspace user authorization failed.");
  }
};

module.exports = requireWorkspaceUserManager;
