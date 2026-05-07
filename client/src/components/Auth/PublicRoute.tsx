import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

export default function PublicRoute() {
  const { user, loading, workspaces } = useAuth();

  // Still loading auth state
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  // Authenticated → redirect to dashboard
  if (user) {
    if (user.role === "superAdmin") {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    const firstWorkspace = workspaces[0];
    const orgId = firstWorkspace?.organization?.organizationId;
    const wsId = firstWorkspace?.workspaceId;
    if (orgId && wsId) return <Navigate to={buildWorkspacePath(orgId, wsId, "dashboard")} replace />;
    if (orgId) return <Navigate to={buildOrganizationPath(orgId, "dashboard")} replace />;
    return <Navigate to="/onboarding" replace />;
  }

  // Not authenticated → render auth pages
  return <Outlet />;
}

