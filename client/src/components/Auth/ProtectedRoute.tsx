import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  roles?: string[];
  requireWorkspace?: boolean;
}

export default function ProtectedRoute({ roles = [], requireWorkspace = true }: ProtectedRouteProps) {
  const { user, loading, role, workspaces, workspacesLoaded, activeWorkspaceId } = useAuth();
  const location = useLocation();

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

  if (!isOnboarding && roles.length > 0 && isWorkspaceScopedRoute) {
    // System super admin route: allow even when a workspace role exists (Admin/Agent/Viewer)
    if (roles.includes("superAdmin") && user?.role === "superAdmin") {
      // ok
    } else if (!role) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-sm text-slate-500">Loading workspace…</div>
        </div>
      );
    } else if (!roles.includes(role)) {
      return <Navigate to="/unauthorized" replace state={{ from: location }} />;
    }
  }

  return <Outlet />;
}
