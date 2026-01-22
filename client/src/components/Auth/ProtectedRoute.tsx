import { Navigate, useLocation, Outlet } from "react-router";
import useAuth from "../../hooks/useAuth";

// ---- Types ----
interface ProtectedRouteProps {
  roles?: string[];
}

export default function ProtectedRoute({ roles = [] }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Authenticated but role not allowed → unauthorized route
  if (roles.length > 0 && !roles.includes(role!)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  // Auth OK → render nested routes
  return <Outlet />;
}
