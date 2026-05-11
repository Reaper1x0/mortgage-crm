const { R4XX } = require("../Responses");
const { userService } = require("../services");

const requireWorkspaceUserManager = async (req, res, next) => {
  try {
    const canManage = userService.canManageWorkspaceUsers({
      orgRole: req.orgRole,
      workspaceRole: req.workspaceRole,
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
