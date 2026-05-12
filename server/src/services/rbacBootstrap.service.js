const mongoose = require("mongoose");
const OrganizationRole = require("../models/organizationRole.model");
const WorkspaceRole = require("../models/workspaceRole.model");
const { ORGANIZATION_KEYS, WORKSPACE_KEYS } = require("../authz/permissionCatalog");

/**
 * Idempotent bootstrap for a newly created organization.
 *
 * - Creates the built-in **Owner** organization role (all org-scope permissions).
 * - Creates one built-in **full-access** workspace role (all workspace-scope permissions).
 *   This is required so the first workspace member row has a valid `workspaceRole` ref;
 *   org owners still get implicit full workspace keys in authz, but the DB FK must exist.
 * - Other org/workspace roles are created by admins via the Roles UI.
 *
 * @returns {Promise<{ orgRoleIds: Record<string, mongoose.Types.ObjectId>, workspaceRoleIds: { fullAccess: mongoose.Types.ObjectId } }>}
 */
async function ensureOrganizationRbac(organizationId) {
  const orgId =
    typeof organizationId === "string" ? new mongoose.Types.ObjectId(organizationId) : organizationId;

  let ownerOrgRole = await OrganizationRole.findOne({
    organization: orgId,
    slug: "owner",
    kind: "system",
  }).lean();

  if (!ownerOrgRole) {
    ownerOrgRole = await OrganizationRole.create({
      organization: orgId,
      slug: "owner",
      name: "Owner",
      kind: "system",
      description: "Full access to all organization features. Cannot be modified.",
      permissions: [...ORGANIZATION_KEYS],
    });
  }

  let fullAccessWsRole = await WorkspaceRole.findOne({
    organization: orgId,
    slug: "full-access",
    kind: "system",
  }).lean();

  if (!fullAccessWsRole) {
    fullAccessWsRole = await WorkspaceRole.create({
      organization: orgId,
      slug: "full-access",
      name: "Full workspace access",
      kind: "system",
      description: "All workspace permissions. Used as default when the org owner creates a workspace. Cannot be modified.",
      permissions: [...WORKSPACE_KEYS],
    });
  }

  return {
    orgRoleIds: { owner: ownerOrgRole._id },
    workspaceRoleIds: { fullAccess: fullAccessWsRole._id },
  };
}

module.exports = { ensureOrganizationRbac };
