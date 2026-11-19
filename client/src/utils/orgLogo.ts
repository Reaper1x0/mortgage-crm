import type { OrganizationMembership, WorkspaceSummary } from "../service/workspaceService";

/** One logo for the organization, wherever it is shown. */
export function resolveOrganizationLogoUrl(
  organization?: Pick<OrganizationMembership, "branding"> | null,
  workspace?: Pick<WorkspaceSummary, "branding"> | null,
): string | null {
  return (
    organization?.branding?.logoUrl ||
    workspace?.branding?.organization?.logoUrl ||
    workspace?.branding?.effective?.logoUrl ||
    null
  );
}
