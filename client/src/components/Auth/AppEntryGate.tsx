import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { OrganizationService } from "../../service/organizationService";
import AppLoadingCard from "../Reusable/AppLoadingCard";
import { buildOrganizationPath } from "../../utils/tenantRouting";
import {
  readLastOrganizationId,
  resolveAppDestination,
} from "../../utils/resolveAppDestination";

/**
 * Single post-auth entry gate for public routes (`/`, `/register`, …).
 * Waits for auth + memberships, then routes organization-first once.
 */
export default function AppEntryGate() {
  const {
    user,
    loading,
    workspacesLoaded,
    organizations,
    workspaces,
    authBootstrapComplete,
    bootstrapStatus,
  } = useAuth();
  const location = useLocation();
  const [refinedPath, setRefinedPath] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from ?? null;
  const fromPath = from?.pathname
    ? `${from.pathname}${from.search || ""}`
    : null;

  const bootstrapDone = authBootstrapComplete ?? (!loading && workspacesLoaded);

  useEffect(() => {
    if (!bootstrapDone || !user) {
      setRefinedPath(null);
      setRefining(false);
      return;
    }

    const base = resolveAppDestination({
      user,
      organizations,
      workspaces,
      lastOrganizationId: readLastOrganizationId(),
      from: fromPath,
    });

    // Only hit onboarding-session when memberships show no org yet.
    if (base !== "/onboarding" || organizations.length > 0) {
      setRefinedPath(base);
      setRefining(false);
      return;
    }

    let cancelled = false;
    setRefining(true);
    void (async () => {
      try {
        const res = await OrganizationService.getOnboardingSession(null);
        const session = res.data?.session;
        if (cancelled) return;
        if (session?.hasOrganization && session.organizationId) {
          setRefinedPath(buildOrganizationPath(session.organizationId, "onboarding"));
        } else {
          setRefinedPath("/onboarding");
        }
      } catch {
        if (!cancelled) setRefinedPath("/onboarding");
      } finally {
        if (!cancelled) setRefining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapDone, user, organizations, workspaces, fromPath]);

  if (!bootstrapDone || (user && refining)) {
    const message = refining
      ? "Checking onboarding status…"
      : bootstrapStatus || "Loading…";
    return <AppLoadingCard message={message} />;
  }

  if (user) {
    const to =
      refinedPath ??
      resolveAppDestination({
        user,
        organizations,
        workspaces,
        lastOrganizationId: readLastOrganizationId(),
        from: fromPath,
      });
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}
