import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

export default function UnauthorizedPage() {
  const { workspaces } = useAuth();
  const first = workspaces[0];
  const orgId = first?.organization?.organizationId;
  const wsId = first?.workspaceId;

  const homeHref =
    orgId && wsId
      ? buildWorkspacePath(orgId, wsId, "dashboard")
      : orgId
        ? buildOrganizationPath(orgId, "onboarding")
        : "/onboarding";

  const homeLabel = orgId && wsId ? "Go to dashboard" : orgId ? "Continue setup" : "Continue setup";

  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl dark:text-slate-100">Access denied</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        You do not have permission to open that page with your current role.
      </p>
      <div className="mt-6">
        <Link
          to={homeHref}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {homeLabel}
        </Link>
      </div>
    </section>
  );
}
