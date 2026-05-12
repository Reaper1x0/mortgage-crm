const mongoose = require("mongoose");
const { R4XX } = require("../Responses");
const workspaceService = require("../services/workspace.service");
const organizationService = require("../services/organization.service");
const authorizationService = require("../services/authorization.service");

/**
 * Requires `Authorization` (isAuth) first. Reads active workspace from `X-Workspace-Id`
 * and sets req.workspaceId, workspace permissions, and legacy req.workspaceRole slug.
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

    let workspaceMember = await workspaceService.findMembership(req.user, id);
    if (workspaceMember && workspaceMember.organization && String(workspaceMember.organization) !== String(orgId)) {
      return R4XX(res, 403, "Workspace membership does not belong to active organization.");
    }

    if (!workspaceMember && !orgMembership.isOwner) {
      return R4XX(res, 403, "You are not a member of this workspace.");
    }

    req.organizationId = orgId;
    req.organizationMember = orgMembership;
    req.isOrgOwner = !!orgMembership.isOwner;
    req.orgRole = orgMembership.organizationRole?.slug || null;
    req.orgPermissions = await authorizationService.getOrganizationPermissionSet(orgMembership);

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
  } catch (err) {
    return R4XX(res, 500, "Workspace validation failed.");
  }
};

module.exports = requireWorkspace;
