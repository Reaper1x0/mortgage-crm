const mongoose = require("mongoose");
const { R4XX } = require("../Responses");
const workspaceService = require("../services/workspace.service");

/**
 * Requires `Authorization` (isAuth) first. Reads active workspace from `X-Workspace-Id`
 * and sets req.workspaceId + req.userRole from membership.
 */
const requireWorkspace = async (req, res, next) => {
  try {
    const raw = req.headers["x-workspace-id"];
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || !mongoose.isValidObjectId(id)) {
      return R4XX(res, 400, "Active workspace is required (X-Workspace-Id header).");
    }

    const member = await workspaceService.findMembership(req.user, id);
    if (!member) {
      return R4XX(res, 403, "You are not a member of this workspace.");
    }

    req.workspaceId = id;
    req.userRole = member.role;
    next();
  } catch (err) {
    return R4XX(res, 500, "Workspace validation failed.");
  }
};

module.exports = requireWorkspace;
