import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { usePermissionsOptional } from "../../context/PermissionContext";

interface ProtectedRouteProps {
  roles?: string[];
  /** If set on org-scoped routes, allows access when the user has any of these org permission keys. */
  organizationPermissionsAny?: string[];
  /** If set on workspace-scoped routes, allows access when the user has any of these workspace permission keys. */
  workspacePermissionsAny?: string[];
  requireWorkspace?: boolean;
}

export default function ProtectedRoute({
  roles = [],
  organizationPermissionsAny = [],
  workspacePermissionsAny = [],
  requireWorkspace = true,
}: ProtectedRouteProps) {
  const { user, loading, role, workspaces, workspacesLoaded, activeWorkspaceId } = useAuth();
  const location = useLocation();
  const perm = usePermissionsOptional();

  if (loading || (user && !workspacesLoaded)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const isOnboarding = location.pathname.includes("/onboarding");

  if (requireWorkspace && !isOnboarding && workspacesLoaded && workspaces.length === 0) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  if (requireWorkspace && !isOnboarding && workspaces.length > 0 && !activeWorkspaceId) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading workspace…</div>
      </div>
    );
  }

  const isWorkspaceScopedRoute = location.pathname.includes("/workspaces/");
  const isTenantScopedRoute = /^\/[a-f\d]{24}(\/|$)/i.test(location.pathname);

  const permissionsPending =
    perm?.loading && perm.effective === null && perm.organizationPermissions.size === 0;

  if (!isOnboarding && isTenantScopedRoute && organizationPermissionsAny.length > 0) {
    if (permissionsPending) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-sm text-slate-500">Loading permissions…</div>
        </div>
      );
    }
    const ok =
      (perm?.canAnyOrg(organizationPermissionsAny) ?? false) ||
      perm?.effective?.isOrgOwner === true;
    if (!ok) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  if (!isOnboarding && isWorkspaceScopedRoute) {
    if (roles.includes("superAdmin") && user?.role === "superAdmin") {
      // ok
    } else if (workspacePermissionsAny.length > 0) {
      if (permissionsPending) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-sm text-slate-500">Loading permissions…</div>
          </div>
        );
      }
      const ok =
        (perm?.canAnyWorkspace(workspacePermissionsAny) ?? false) ||
        perm?.effective?.isOrgOwner === true;
      if (!ok) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
      }
    } else if (roles.length > 0) {
      if (!role) {
        return (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="text-sm text-slate-500">Loading workspace…</div>
          </div>
        );
      } else if (!roles.includes(role)) {
        return <Navigate to="/unauthorized" replace state={{ from: location }} />;
      }
    }
  }

  return <Outlet />;
}
