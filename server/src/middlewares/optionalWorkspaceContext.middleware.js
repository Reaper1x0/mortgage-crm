const mongoose = require("mongoose");
const { R4XX } = require("../Responses");
const workspaceService = require("../services/workspace.service");
const authorizationService = require("../services/authorization.service");

/**
 * Run after `requireOrganization`. If `X-Workspace-Id` is present and valid, attaches
 * `req.workspaceId` and `req.workspacePermissions` for `requirePermission` with `scope: "either"`.
 * If the header is omitted, leaves workspace fields unset (org-only permission checks).
 */
const attachWorkspacePermissionsIfPresent = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const orgMembership = req.organizationMember;
    if (!orgId || !orgMembership) {
      return R4XX(res, 500, "Organization context required before optional workspace attachment.");
    }

    const raw = req.headers["x-workspace-id"];
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || !mongoose.isValidObjectId(id)) {
      return next();
    }

    const workspace = await workspaceService.getWorkspaceById(id);
    if (!workspace) {
      return R4XX(res, 404, "Workspace not found.");
    }
    if (workspace.organization && String(workspace.organization) !== String(orgId)) {
      return R4XX(res, 403, "Workspace does not belong to active organization.");
    }

    let workspaceMember = await workspaceService.findMembership(req.user, id);
    if (workspaceMember && workspaceMember.organization && String(workspaceMember.organization) !== String(orgId)) {
      return R4XX(res, 403, "Workspace membership does not belong to active organization.");
    }

    if (!workspaceMember && !orgMembership.isOwner) {
      return R4XX(res, 403, "You are not a member of this workspace.");
    }

    req.workspaceId = id;
    if (!workspaceMember && orgMembership.isOwner) {
      req.workspaceMember = null;
      req.workspaceRole = "owner";
      req.userRole = "owner";
      req.workspacePermissions = authorizationService.wsKeySet();
    } else {
      req.workspaceMember = workspaceMember;
      req.workspaceRole = workspaceMember.workspaceRole?.slug || null;
      req.userRole = req.workspaceRole;
      req.workspacePermissions = await authorizationService.getWorkspacePermissionSet({
        orgMemberLean: orgMembership,
        workspaceMemberLean: workspaceMember,
      });
    }

    next();
  } catch (_err) {
    return R4XX(res, 500, "Optional workspace context failed.");
  }
};

module.exports = attachWorkspacePermissionsIfPresent;
