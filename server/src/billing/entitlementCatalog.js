const ENTITLEMENT_CATALOG = {
  max_organization_members: {
    key: "max_organization_members",
    type: "limit",
    label: "Organization Members",
    description: "Maximum members across organization.",
    unlimitedValue: -1,
  },
  max_workspaces_per_organization: {
    key: "max_workspaces_per_organization",
    type: "limit",
    label: "Workspaces",
    description: "Maximum workspaces under organization.",
    unlimitedValue: -1,
  },
  max_workspace_members: {
    key: "max_workspace_members",
    type: "limit",
    label: "Workspace Members",
    description: "Maximum members in each workspace.",
    unlimitedValue: -1,
  },
  max_submissions: {
    key: "max_submissions",
    type: "limit",
    label: "Submissions",
    description: "Maximum submissions per workspace.",
    unlimitedValue: -1,
  },
  max_templates: {
    key: "max_templates",
    type: "limit",
    label: "Templates",
    description: "Maximum templates per workspace.",
    unlimitedValue: -1,
  },
  max_monthly_extractions: {
    key: "max_monthly_extractions",
    type: "usage",
    label: "Monthly Extractions",
    description: "Maximum extraction operations per organization per month.",
    unlimitedValue: -1,
  },
};

const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENT_CATALOG);

const isUnlimited = (value) => value === -1 || value === null;

module.exports = {
  ENTITLEMENT_CATALOG,
  ENTITLEMENT_KEYS,
  isUnlimited,
};
