import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import {
  OrganizationService,
  PermissionCatalogEntry,
  EffectivePermissions,
} from "../service/organizationService";
import { resolvePermissionScope, type PermissionScope } from "../utils/permissionScope";
import {
  clearPermissionCache,
  getPermissionCatalog,
  getPermissionSnapshot,
  invalidatePermissionScope,
  setPermissionCatalog,
  setPermissionSnapshot,
  type PermissionSnapshot,
} from "../utils/permissionCache";

export type PermissionContextValue = {
  /** True only while loading permissions for the current scope (no cached data yet). */
  loading: boolean;
  organizationPermissions: Set<string>;
  workspacePermissions: Set<string>;
  effective: EffectivePermissions | null;
  catalog: PermissionCatalogEntry[];
  canOrg: (key: string) => boolean;
  canWorkspace: (key: string) => boolean;
  canAnyOrg: (keys: string[]) => boolean;
  canAnyWorkspace: (keys: string[]) => boolean;
  /** Refetch in the background (does not block routes). Call after RBAC changes. */
  refreshPermissions: () => Promise<void>;
};

const emptySnapshot = (): PermissionSnapshot => ({
  effective: null,
  organizationPermissions: new Set(),
  workspacePermissions: new Set(),
  catalog: [],
});

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, activeWorkspaceId, workspaces } = useAuth();

  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<PermissionSnapshot>(emptySnapshot);

  const scopeRef = useRef<PermissionScope | null>(null);
  const inflightKeyRef = useRef<string | null>(null);

  const workspaceMembershipKey = useMemo(
    () =>
      workspaces
        .map((w) => `${w.workspaceId}:${w.organization?.organizationId ?? ""}`)
        .sort()
        .join("|"),
    [workspaces]
  );

  const scope = useMemo(
    () =>
      resolvePermissionScope({
        pathname: location.pathname,
        isAuthenticated,
        activeWorkspaceId,
        workspaces,
      }),
    [location.pathname, isAuthenticated, activeWorkspaceId, workspaceMembershipKey, workspaces]
  );

  scopeRef.current = scope;

  const loadScope = useCallback(async (target: PermissionScope, options?: { force?: boolean }) => {
    const { force = false } = options ?? {};
    const cacheKey = target.cacheKey;

    if (inflightKeyRef.current === cacheKey && !force) {
      return;
    }

    if (!force) {
      const cached = getPermissionSnapshot(cacheKey);
      if (cached) {
        setSnapshot(cached);
        setLoading(false);
        return;
      }
    } else {
      invalidatePermissionScope(cacheKey);
    }

    const showBlockingLoader = !force && !getPermissionSnapshot(cacheKey);
    if (showBlockingLoader) {
      setLoading(true);
    }

    inflightKeyRef.current = cacheKey;

    try {
      let catalogList = getPermissionCatalog(target.organizationId);
      if (!catalogList || force) {
        const catRes = await OrganizationService.getAuthzCatalog(target.organizationId).catch(() => ({
          data: { permissions: [] as PermissionCatalogEntry[] },
        }));
        catalogList = Array.isArray(catRes.data?.permissions) ? catRes.data.permissions : [];
        setPermissionCatalog(target.organizationId, catalogList);
      }

      const effRes = await OrganizationService.getAuthzEffective(
        target.workspaceId,
        target.organizationId
      );
      const eff = effRes.data?.effective ?? null;

      if (scopeRef.current?.cacheKey !== cacheKey) return;

      const next: PermissionSnapshot = {
        effective: eff,
        organizationPermissions: new Set(eff?.organizationPermissions || []),
        workspacePermissions: new Set(eff?.workspacePermissions || []),
        catalog: catalogList,
      };

      setPermissionSnapshot(cacheKey, next);
      setSnapshot(next);
    } catch {
      if (scopeRef.current?.cacheKey !== cacheKey) return;
      setSnapshot(emptySnapshot());
    } finally {
      if (inflightKeyRef.current === cacheKey) {
        inflightKeyRef.current = null;
      }
      if (showBlockingLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      clearPermissionCache();
      inflightKeyRef.current = null;
      setSnapshot(emptySnapshot());
      setLoading(false);
      return;
    }

    const target = scopeRef.current;
    if (!target) {
      inflightKeyRef.current = null;
      setSnapshot(emptySnapshot());
      setLoading(false);
      return;
    }

    void loadScope(target);
  }, [isAuthenticated, scope?.cacheKey, loadScope]);

  useEffect(() => {
    const onLogout = () => {
      clearPermissionCache();
      inflightKeyRef.current = null;
      setSnapshot(emptySnapshot());
      setLoading(false);
    };
    window.addEventListener("auth:user-logged-out", onLogout);
    return () => window.removeEventListener("auth:user-logged-out", onLogout);
  }, []);

  const refreshPermissions = useCallback(async () => {
    const target = scopeRef.current;
    if (!target) return;
    await loadScope(target, { force: true });
  }, [loadScope]);

  const { organizationPermissions: orgPerms, workspacePermissions: wsPerms, effective, catalog } =
    snapshot;

  const canOrg = useCallback((key: string) => orgPerms.has(key), [orgPerms]);
  const canWorkspace = useCallback((key: string) => wsPerms.has(key), [wsPerms]);
  const canAnyOrg = useCallback((keys: string[]) => keys.some((k) => orgPerms.has(k)), [orgPerms]);
  const canAnyWorkspace = useCallback(
    (keys: string[]) => keys.some((k) => wsPerms.has(k)),
    [wsPerms]
  );

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
    [
      loading,
      orgPerms,
      wsPerms,
      effective,
      catalog,
      canOrg,
      canWorkspace,
      canAnyOrg,
      canAnyWorkspace,
      refreshPermissions,
    ]
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

export function PermissionGate({
  any: anyKeys,
  all: allKeys,
  scope = "workspace",
  children,
  fallback = null,
}: GateProps) {
  const ctx = useContext(PermissionContext);
  if (!ctx) return <>{children}</>;
  const { loading, organizationPermissions, workspacePermissions, effective } = ctx;
  if (loading && !effective) return null;
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
