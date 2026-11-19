import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { usePermissionsOptional } from "../../context/PermissionContext";
import AppLoadingCard from "../Reusable/AppLoadingCard";

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
  const { user, loading, workspaces, workspacesLoaded, activeWorkspaceId, bootstrapStatus } =
    useAuth();
  const location = useLocation();
  const perm = usePermissionsOptional();

  if (loading || (user && !workspacesLoaded)) {
    return <AppLoadingCard message={bootstrapStatus || "Loading your session…"} />;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // System roles (e.g. superAdmin) apply to any protected route, not only /workspaces/*.
  if (roles.length > 0) {
    const systemRole = user.role || null;
    if (!systemRole || !roles.includes(systemRole)) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  const isOnboarding = location.pathname.includes("/onboarding");

  if (requireWorkspace && !isOnboarding && workspacesLoaded && workspaces.length === 0) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  if (requireWorkspace && !isOnboarding && workspaces.length > 0 && !activeWorkspaceId) {
    return <AppLoadingCard message="Loading workspace…" />;
  }

  const isWorkspaceScopedRoute = location.pathname.includes("/workspaces/");
  const isTenantScopedRoute = /^\/[a-f\d]{24}(\/|$)/i.test(location.pathname);
  const permissionsPending = perm?.loading ?? false;

  if (!isOnboarding && isTenantScopedRoute && organizationPermissionsAny.length > 0) {
    if (permissionsPending) {
      return <AppLoadingCard message="Loading organization access…" />;
    }
    const ok =
      (perm?.canAnyOrg(organizationPermissionsAny) ?? false) ||
      perm?.effective?.isOrgOwner === true;
    if (!ok) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  if (!isOnboarding && isWorkspaceScopedRoute && workspacePermissionsAny.length > 0) {
    if (permissionsPending) {
      return <AppLoadingCard message="Loading workspace access…" />;
    }
    const ok =
      (perm?.canAnyWorkspace(workspacePermissionsAny) ?? false) ||
      perm?.effective?.isOrgOwner === true;
    if (!ok) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  return <Outlet />;
}
