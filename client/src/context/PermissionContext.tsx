import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { OrganizationService, PermissionCatalogEntry, EffectivePermissions } from "../service/organizationService";
import { getTenantFromPath } from "../utils/tenantRouting";

export type PermissionContextValue = {
  loading: boolean;
  organizationPermissions: Set<string>;
  workspacePermissions: Set<string>;
  effective: EffectivePermissions | null;
  catalog: PermissionCatalogEntry[];
  canOrg: (key: string) => boolean;
  canWorkspace: (key: string) => boolean;
  canAnyOrg: (keys: string[]) => boolean;
  canAnyWorkspace: (keys: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, activeWorkspaceId, workspaces } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orgPerms, setOrgPerms] = useState<Set<string>>(new Set());
  const [wsPerms, setWsPerms] = useState<Set<string>>(new Set());
  const [effective, setEffective] = useState<EffectivePermissions | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalogEntry[]>([]);

  const refreshPermissions = useCallback(async () => {
    const pathname = location.pathname;
    if (pathname.includes("/onboarding")) {
      setOrgPerms(new Set());
      setWsPerms(new Set());
      setEffective(null);
      setCatalog([]);
      return;
    }
    // Only load org-scoped authz when the URL is tenant-scoped (`/:organizationId/...`).
    // Do not use `activeOrganizationId` alone: on `/unauthorized`, `/`, etc. the API client
    // has no org in the path, so requests would omit X-Organization-Id and spam 400 toasts.
    const { organizationId: pathOrg, workspaceId: pathWs } = getTenantFromPath(pathname);
    if (!isAuthenticated || !pathOrg) {
      setOrgPerms(new Set());
      setWsPerms(new Set());
      setEffective(null);
      setCatalog([]);
      return;
    }
    const activeBelongsToOrg =
      activeWorkspaceId &&
      workspaces.some(
        (w) => w.workspaceId === activeWorkspaceId && w.organization?.organizationId === pathOrg
      );
    const effectiveWorkspaceId =
      pathWs ||
      (activeBelongsToOrg ? activeWorkspaceId : undefined) ||
      workspaces.find((w) => w.organization?.organizationId === pathOrg)?.workspaceId ||
      undefined;
    setLoading(true);
    try {
      const [effRes, catRes] = await Promise.all([
        OrganizationService.getAuthzEffective(effectiveWorkspaceId, pathOrg),
        OrganizationService.getAuthzCatalog(pathOrg).catch(() => ({ data: { permissions: [] as PermissionCatalogEntry[] } })),
      ]);
      const eff = effRes.data?.effective ?? null;
      setEffective(eff);
      setOrgPerms(new Set(eff?.organizationPermissions || []));
      setWsPerms(new Set(eff?.workspacePermissions || []));
      const perms = catRes.data?.permissions;
      setCatalog(Array.isArray(perms) ? perms : []);
    } catch {
      setOrgPerms(new Set());
      setWsPerms(new Set());
      setEffective(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, location.pathname, activeWorkspaceId, workspaces]);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const canOrg = useCallback((key: string) => orgPerms.has(key), [orgPerms]);
  const canWorkspace = useCallback((key: string) => wsPerms.has(key), [wsPerms]);
  const canAnyOrg = useCallback((keys: string[]) => keys.some((k) => orgPerms.has(k)), [orgPerms]);
  const canAnyWorkspace = useCallback((keys: string[]) => keys.some((k) => wsPerms.has(k)), [wsPerms]);

  const value = useMemo<PermissionContextValue>(
    () => ({
      loading,
      organizationPermissions: orgPerms,
      workspacePermissions: wsPerms,
      effective,
      catalog,
      canOrg,
      canWorkspace,
      canAnyOrg,
      canAnyWorkspace,
      refreshPermissions,
    }),
    [loading, orgPerms, wsPerms, effective, catalog, canOrg, canWorkspace, canAnyOrg, canAnyWorkspace, refreshPermissions]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return ctx;
}

export function usePermissionsOptional(): PermissionContextValue | null {
  return useContext(PermissionContext) ?? null;
}

type GateProps = {
  any?: string[];
  all?: string[];
  scope?: "organization" | "workspace";
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ any: anyKeys, all: allKeys, scope = "workspace", children, fallback = null }: GateProps) {
  const ctx = useContext(PermissionContext);
  if (!ctx) return <>{children}</>;
  const { loading, organizationPermissions, workspacePermissions } = ctx;
  if (loading) return null;
  const set = scope === "organization" ? organizationPermissions : workspacePermissions;
  const has = (k: string) => set.has(k);
  if (anyKeys?.length) {
    return <>{anyKeys.some(has) ? children : fallback}</>;
  }
  if (allKeys?.length) {
    return <>{allKeys.every(has) ? children : fallback}</>;
  }
  return <>{children}</>;
}
