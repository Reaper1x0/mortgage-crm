import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function PublicRoute() {
  const { user, loading } = useAuth();

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
    return <Navigate to="/workspace/dashboard/analytics" replace />;
  }

  // Not authenticated → render auth pages
  return <Outlet />;
}

