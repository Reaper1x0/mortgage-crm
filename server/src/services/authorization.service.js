const mongoose = require("mongoose");
const OrganizationRole = require("../models/organizationRole.model");
const WorkspaceRole = require("../models/workspaceRole.model");
const { ORGANIZATION_KEYS, WORKSPACE_KEYS, ORGANIZATION_SCOPE, WORKSPACE_SCOPE } = require("../authz/permissionCatalog");

const orgKeySet = () => new Set(ORGANIZATION_KEYS);
const wsKeySet  = () => new Set(WORKSPACE_KEYS);

function roleRefToId(roleRef) {
  if (!roleRef) return null;
  return roleRef._id || roleRef;
}

/** Expand an org role's permissions[] into a Set<string> */
async function permissionsFromOrganizationRole(roleRef) {
  const id = roleRefToId(roleRef);
  if (!id) return new Set();
  const role = await OrganizationRole.findById(id).lean();
  if (!role) return new Set();
  return new Set(role.permissions || []);
}

/** Expand a workspace role's permissions[] into a Set<string> */
async function permissionsFromWorkspaceRole(roleRef) {
  const id = roleRefToId(roleRef);
  if (!id) return new Set();
  const role = await WorkspaceRole.findById(id).lean();
  if (!role) return new Set();
  return new Set(role.permissions || []);
}

/**
 * Org owners implicitly hold every org-scope key.
 * Other members get exactly the permissions stored in their assigned org role.
 */
async function getOrganizationPermissionSet(orgMemberLean) {
  if (!orgMemberLean) return new Set();
  if (orgMemberLean.isOwner) return orgKeySet();
  return permissionsFromOrganizationRole(orgMemberLean.organizationRole);
}

/**
 * Org owners also get every workspace-scope key in any workspace.
 * Regular members get the permissions from their assigned workspace role.
 */
async function getWorkspacePermissionSet({ orgMemberLean, workspaceMemberLean }) {
  if (!orgMemberLean) return new Set();
  if (orgMemberLean.isOwner) return wsKeySet();
  if (!workspaceMemberLean?.workspaceRole) return new Set();
  return permissionsFromWorkspaceRole(workspaceMemberLean.workspaceRole);
}

function setToSortedArray(set) {
  return Array.from(set).sort();
}

function canManageWorkspaceUsers({ orgPerms, wsPerms }) {
  if (orgPerms.has("organization.members.invite") || orgPerms.has("organization.members.update")) return true;
  return wsPerms.has("workspace.users.manage");
}

/** Effective permissions returned to the client on auth bootstrap */
async function getEffectiveForUser({ userId, organizationId, workspaceId }) {
  const { OrganizationMember, WorkspaceMember } = require("../models");

  const orgMember = await OrganizationMember.findOne({
    user: userId,
    organization: organizationId,
  })
    .populate({ path: "organizationRole", select: "slug name permissions" })
    .lean();

  const orgPerms = await getOrganizationPermissionSet(orgMember);

  let wsPerms = new Set();
  if (workspaceId && mongoose.isValidObjectId(String(workspaceId))) {
    const wsMember = await WorkspaceMember.findOne({
      user: userId,
      workspace: workspaceId,
      organization: organizationId,
    })
      .populate({ path: "workspaceRole", select: "slug name permissions" })
      .lean();
    wsPerms = await getWorkspacePermissionSet({
      orgMemberLean: orgMember,
      workspaceMemberLean: wsMember,
    });
  }

  const orgRoleId = roleRefToId(orgMember?.organizationRole);

  return {
    isOrgOwner: !!orgMember?.isOwner,
    organizationRoleId: orgRoleId ? String(orgRoleId) : null,
    organizationRoleSlug: orgMember?.organizationRole?.slug || null,
    organizationPermissions: setToSortedArray(orgPerms),
    workspacePermissions: workspaceId ? setToSortedArray(wsPerms) : null,
    canManageWorkspaceUsers: canManageWorkspaceUsers({ orgPerms, wsPerms }),
  };
}

module.exports = {
  permissionsFromOrganizationRole,
  permissionsFromWorkspaceRole,
  getOrganizationPermissionSet,
  getWorkspacePermissionSet,
  canManageWorkspaceUsers,
  getEffectiveForUser,
  orgKeySet,
  wsKeySet,
  ORGANIZATION_SCOPE,
  WORKSPACE_SCOPE,
};
