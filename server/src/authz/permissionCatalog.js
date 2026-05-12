/**
 * Static permission catalog. Keys are the contract for route gating and UI.
 */

const ORGANIZATION_SCOPE = "organization";
const WORKSPACE_SCOPE = "workspace";

/** @type {{ key: string, scope: typeof ORGANIZATION_SCOPE | typeof WORKSPACE_SCOPE, label: string }[]} */
const PERMISSIONS = [
  { key: "organization.organization.read", scope: ORGANIZATION_SCOPE, label: "View organization profile" },
  { key: "organization.organization.update", scope: ORGANIZATION_SCOPE, label: "Update organization profile & branding" },
  { key: "organization.billing.read", scope: ORGANIZATION_SCOPE, label: "View billing" },
  { key: "organization.billing.manage", scope: ORGANIZATION_SCOPE, label: "Manage billing & subscriptions" },
  { key: "organization.members.read", scope: ORGANIZATION_SCOPE, label: "View organization members" },
  { key: "organization.members.invite", scope: ORGANIZATION_SCOPE, label: "Invite or add organization members" },
  { key: "organization.members.update", scope: ORGANIZATION_SCOPE, label: "Update member roles & workspace access" },
  { key: "organization.members.remove", scope: ORGANIZATION_SCOPE, label: "Remove organization members" },
  {
    key: "organization.members.promote_admin",
    scope: ORGANIZATION_SCOPE,
    label: "Assign or change admin-level organization roles",
  },
  { key: "organization.rbac.manage", scope: ORGANIZATION_SCOPE, label: "Manage permission groups and roles" },
  { key: "organization.workspaces.create", scope: ORGANIZATION_SCOPE, label: "Create workspaces in the organization" },

  { key: "workspace.workspace.read", scope: WORKSPACE_SCOPE, label: "View workspace" },
  { key: "workspace.workspace.update", scope: WORKSPACE_SCOPE, label: "Update workspace settings & branding" },
  { key: "workspace.dashboard.read", scope: WORKSPACE_SCOPE, label: "View dashboard" },
  { key: "workspace.submissions.read", scope: WORKSPACE_SCOPE, label: "View submissions" },
  { key: "workspace.submissions.write", scope: WORKSPACE_SCOPE, label: "Create or update submissions" },
  { key: "workspace.submissions.manage", scope: WORKSPACE_SCOPE, label: "Delete submissions or manage extraction pipeline" },
  { key: "workspace.templates.read", scope: WORKSPACE_SCOPE, label: "View templates" },
  { key: "workspace.templates.write", scope: WORKSPACE_SCOPE, label: "Edit template content & placements" },
  { key: "workspace.templates.manage", scope: WORKSPACE_SCOPE, label: "Create or delete templates" },
  { key: "workspace.masterfields.read", scope: WORKSPACE_SCOPE, label: "View master fields" },
  { key: "workspace.masterfields.write", scope: WORKSPACE_SCOPE, label: "Manage master fields" },
  { key: "workspace.leads.read", scope: WORKSPACE_SCOPE, label: "View leads" },
  { key: "workspace.leads.write", scope: WORKSPACE_SCOPE, label: "Manage leads" },
  { key: "workspace.extraction.run", scope: WORKSPACE_SCOPE, label: "Run extraction jobs" },
  { key: "workspace.audit.read", scope: WORKSPACE_SCOPE, label: "View audit trail" },
  { key: "workspace.users.read", scope: WORKSPACE_SCOPE, label: "View workspace members" },
  { key: "workspace.users.manage", scope: WORKSPACE_SCOPE, label: "Manage workspace members" },
];

const ALL_KEYS = PERMISSIONS.map((p) => p.key);
const ORGANIZATION_KEYS = PERMISSIONS.filter((p) => p.scope === ORGANIZATION_SCOPE).map((p) => p.key);
const WORKSPACE_KEYS = PERMISSIONS.filter((p) => p.scope === WORKSPACE_SCOPE).map((p) => p.key);
const KEY_SET = new Set(ALL_KEYS);

function assertKnownKeys(keys) {
  const unknown = keys.filter((k) => !KEY_SET.has(k));
  if (unknown.length) {
    throw new Error(`Unknown permission keys: ${unknown.join(", ")}`);
  }
}

module.exports = {
  PERMISSIONS,
  ALL_KEYS,
  ORGANIZATION_KEYS,
  WORKSPACE_KEYS,
  ORGANIZATION_SCOPE,
  WORKSPACE_SCOPE,
  KEY_SET,
  assertKnownKeys,
};
