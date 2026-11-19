import type { User } from "../types/auth.types";
import type { OrganizationMembership, WorkspaceSummary } from "../service/workspaceService";
import { buildOrganizationPath, buildWorkspacePath } from "./tenantRouting";

export const LAST_ORGANIZATION_ID_KEY = "lastOrganizationId";

export function readLastOrganizationId(): string | null {
  try {
    return localStorage.getItem(LAST_ORGANIZATION_ID_KEY);
  } catch {
    return null;
  }
}

export function writeLastOrganizationId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_ORGANIZATION_ID_KEY, id);
    else localStorage.removeItem(LAST_ORGANIZATION_ID_KEY);
  } catch {
    // ignore quota / private mode
  }
}

export type ResolveAppDestinationInput = {
  user: User;
  organizations: OrganizationMembership[];
  workspaces: WorkspaceSummary[];
  lastOrganizationId?: string | null;
  /** Valid in-app deep link to restore after login (pathname + search). */
  from?: string | null;
};

function isOrgManager(org: OrganizationMembership | undefined): boolean {
  if (!org) return false;
  if (org.isOrgOwner) return true;
  const role = String(org.organizationRole || "").toLowerCase();
  return role === "owner" || role === "admin";
}

function workspacesForOrg(
  organizationId: string,
  organizations: OrganizationMembership[],
  workspaces: WorkspaceSummary[],
): Array<{ workspaceId: string }> {
  const membership = organizations.find((o) => o.organizationId === organizationId);
  if (membership?.workspaces?.length) {
    return membership.workspaces;
  }
  return workspaces.filter((w) => w.organization?.organizationId === organizationId);
}

/** Pick preferred organization: sticky last → memberships[0] → org from a workspace. */
export function pickPreferredOrganizationId(
  organizations: OrganizationMembership[],
  workspaces: WorkspaceSummary[],
  lastOrganizationId?: string | null,
): string | null {
  if (lastOrganizationId && organizations.some((o) => o.organizationId === lastOrganizationId)) {
    return lastOrganizationId;
  }
  if (organizations[0]?.organizationId) return organizations[0].organizationId;
  return workspaces[0]?.organization?.organizationId ?? null;
}

/**
 * Organization-first post-auth destination.
 * Call only after memberships have loaded.
 */
export function resolveAppDestination({
  user,
  organizations,
  workspaces,
  lastOrganizationId,
  from,
}: ResolveAppDestinationInput): string {
  const isSuperAdmin = user.role === "superAdmin";

  if (isSuperAdmin) {
    return "/super-admin/dashboard";
  }

  if (!user.isEmailVerified) {
    return "/email-verification";
  }

  const fromPath = typeof from === "string" ? from.trim() : "";
  if (fromPath.startsWith("/") && !fromPath.startsWith("//")) {
    const pathOnly = fromPath.split("?")[0];
    const isAuthPage =
      pathOnly === "/" ||
      pathOnly === "/register" ||
      pathOnly === "/forgot-password" ||
      pathOnly === "/email-verification" ||
      pathOnly === "/onboarding" ||
      pathOnly.startsWith("/email-verification");
    const isSuperAdminPath = pathOnly === "/super-admin" || pathOnly.startsWith("/super-admin/");
    // Never restore a privileged deep link the signed-in user cannot use.
    if (!isAuthPage && (!isSuperAdminPath || isSuperAdmin)) {
      return fromPath;
    }
  }

  const orgId = pickPreferredOrganizationId(organizations, workspaces, lastOrganizationId);
  if (!orgId) {
    return "/onboarding";
  }

  const orgWorkspaces = workspacesForOrg(orgId, organizations, workspaces);
  if (orgWorkspaces.length === 0) {
    return buildOrganizationPath(orgId, "onboarding");
  }

  const membership = organizations.find((o) => o.organizationId === orgId);
  if (isOrgManager(membership)) {
    // Org owners/admins land on organization overview (KPIs + workspace cards).
    return buildOrganizationPath(orgId, "dashboard");
  }

  // Workspace-only members: stay under the preferred org, open its first workspace.
  const wsId = orgWorkspaces[0]?.workspaceId;
  if (wsId) {
    return buildWorkspacePath(orgId, wsId, "dashboard");
  }

  return buildOrganizationPath(orgId, "dashboard");
}
