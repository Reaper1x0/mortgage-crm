import type { WorkspaceSummary } from "../service/workspaceService";
import { getTenantFromPath } from "./tenantRouting";

/** When permissions apply: one org + optional workspace (not every URL segment). */
export type PermissionScope = {
  organizationId: string;
  workspaceId: string | undefined;
  cacheKey: string;
};

export function resolvePermissionScope(params: {
  pathname: string;
  isAuthenticated: boolean;
  activeWorkspaceId: string | null;
  workspaces: WorkspaceSummary[];
}): PermissionScope | null {
  const { pathname, isAuthenticated, activeWorkspaceId, workspaces } = params;

  if (pathname.includes("/onboarding")) return null;

  const { organizationId: pathOrg, workspaceId: pathWs } = getTenantFromPath(pathname);
  if (!isAuthenticated || !pathOrg) return null;

  // Org settings / billing / members: stable scope (no workspace) — avoids refetch loops when activeWorkspaceId changes.
  const isOrgOnlyRoute = !pathWs && !pathname.includes("/workspaces/");

  const activeBelongsToOrg =
    Boolean(activeWorkspaceId) &&
    workspaces.some(
      (w) => w.workspaceId === activeWorkspaceId && w.organization?.organizationId === pathOrg
    );

  const workspaceId = isOrgOnlyRoute
    ? undefined
    : pathWs ||
      (activeBelongsToOrg ? activeWorkspaceId! : undefined) ||
      workspaces.find((w) => w.organization?.organizationId === pathOrg)?.workspaceId ||
      undefined;

  return {
    organizationId: pathOrg,
    workspaceId,
    cacheKey: `${pathOrg}:${workspaceId ?? ""}`,
  };
}
