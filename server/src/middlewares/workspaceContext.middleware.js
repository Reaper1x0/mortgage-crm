const mongoose = require("mongoose");
const { R4XX } = require("../Responses");
const workspaceService = require("../services/workspace.service");
const organizationService = require("../services/organization.service");

/**
 * Requires `Authorization` (isAuth) first. Reads active workspace from `X-Workspace-Id`
 * and sets req.workspaceId + req.userRole from membership.
 */
const requireWorkspace = async (req, res, next) => {
  try {
    const orgRaw = req.headers["x-organization-id"];
    const orgId = typeof orgRaw === "string" ? orgRaw.trim() : "";
    const raw = req.headers["x-workspace-id"];
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      return R4XX(res, 400, "Active organization is required (X-Organization-Id header).");
    }
    if (!id || !mongoose.isValidObjectId(id)) {
      return R4XX(res, 400, "Active workspace is required (X-Workspace-Id header).");
    }

    const orgMembership = await organizationService.findMembership(req.user, orgId);
    if (!orgMembership) {
      return R4XX(res, 403, "You are not a member of this organization.");
    }

    const workspace = await workspaceService.getWorkspaceById(id);
    if (!workspace) {
      return R4XX(res, 404, "Workspace not found.");
    }
    if (workspace.organization && String(workspace.organization) !== String(orgId)) {
      return R4XX(res, 403, "Workspace does not belong to active organization.");
    }

    const member = await workspaceService.findMembership(req.user, id);
    if (!member) {
      return R4XX(res, 403, "You are not a member of this workspace.");
    }

    if (member.organization && String(member.organization) !== String(orgId)) {
      return R4XX(res, 403, "Workspace membership does not belong to active organization.");
    }

    req.organizationId = orgId;
    req.orgRole = orgMembership.role;
    req.workspaceId = id;
    req.workspaceRole = member.role;
    req.userRole = member.role;
    next();
  } catch (err) {
    return R4XX(res, 500, "Workspace validation failed.");
  }
};

module.exports = requireWorkspace;
