import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router";
import Register from "./components/Auth/Register";
import Login from "./components/Auth/Login";
import Layout from "./components/Layout/Layout";
import EmailVerification from "./components/Auth/EmailVerification";
import ForgotPassword from "./components/Auth/ForgotPassword";
import NotFoundPage from "./components/Static/NotFoundPage";
import UnauthorizedPage from "./components/Static/UnauthorizedPage";
import Profile from "./components/Auth/Profile";
import MasterFieldTable from "./components/MasterField/MasterFieldTable";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import PublicRoute from "./components/Auth/PublicRoute";
import WorkspaceLayout from "./components/Layout/WorkspaceLayout";
import SubmissionsPage from "./components/Submissions/SubmissionsPage";
import SubmissionManagementPage from "./components/Submissions/SubmissionManagementPage";
import ClientAssistantPage from "./components/Assistant/ClientAssistantPage";
import TemplateMaker from "./components/TemplateMaker/TemplatesPage";
import TemplateDesignerPage from "./components/TemplateMaker/TemplateDesignerPage";
import WorkspaceUsersPage from "./components/Users/WorkspaceUsersPage";
import DashboardAnalytics from "./components/Dashboard/DashboardAnalytics";
import LeadsPage from "./components/Leads/LeadsPage";
import WorkspaceOnboarding from "./components/Workspace/WorkspaceOnboarding";
import SettingsLayout from "./components/Layout/SettingsLayout";
import AccountSettingsLayout from "./components/Layout/AccountSettingsLayout";
import OrganizationSettings from "./components/Workspace/OrganizationSettings";
import SuperAdminLayout from "./components/Layout/SuperAdminLayout";
import SuperAdminUsersPage from "./components/SuperAdmin/SuperAdminUsersPage";
import SuperAdminOrganizationsPage from "./components/SuperAdmin/SuperAdminOrganizationsPage";
import SuperAdminWorkspacesPage from "./components/SuperAdmin/SuperAdminWorkspacesPage";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard";
import SuperAdminPlansPage from "./components/SuperAdmin/SuperAdminPlansPage";
import SuperAdminSubscriptionsPage from "./components/SuperAdmin/SuperAdminSubscriptionsPage";
import SuperAdminSubscriptionDetailPage from "./components/SuperAdmin/SuperAdminSubscriptionDetailPage";
import BillingSettings from "./components/Workspace/BillingSettings";
import OrganizationUsersSettings from "./components/Workspace/OrganizationUsersSettings";
import OrganizationAccessSettings from "./components/Workspace/OrganizationAccessSettings";
import PricingPage from "./components/Billing/PricingPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import { buildOrganizationPath, buildWorkspacePath, getTenantFromPath } from "./utils/tenantRouting";

/** Keeps active org in AuthContext aligned with the URL. Preserves a workspace when the path is org-only (e.g. settings). */
function SyncTenantFromUrl() {
  const location = useLocation();
  const { setActiveOrganizationId, setActiveWorkspaceId, workspaces } = useAuth();
  useEffect(() => {
    const t = getTenantFromPath(location.pathname);
    setActiveOrganizationId(t.organizationId);
    if (t.workspaceId) {
      setActiveWorkspaceId(t.workspaceId);
      return;
    }
    if (t.organizationId) {
      const firstInOrg = workspaces.find((w) => w.organization?.organizationId === t.organizationId);
      if (firstInOrg?.workspaceId) {
        setActiveWorkspaceId(firstInOrg.workspaceId);
        return;
      }
    }
    if (!t.organizationId) {
      setActiveWorkspaceId(null);
    }
  }, [location.pathname, workspaces, setActiveOrganizationId, setActiveWorkspaceId]);
  return null;
}

function OrgDashboardRedirect() {
  const { organizationId } = useParams();
  const { workspaces } = useAuth();
  const firstOrgWorkspace = workspaces.find((w) => w.organization?.organizationId === organizationId) || workspaces[0];
  if (organizationId && firstOrgWorkspace?.workspaceId) {
    return <Navigate to={buildWorkspacePath(organizationId, firstOrgWorkspace.workspaceId, "dashboard")} replace />;
  }
  if (organizationId) return <Navigate to={buildOrganizationPath(organizationId, "onboarding")} replace />;
  return <Navigate to="/onboarding" replace />;
}

function LegacyWorkspaceRedirect() {
  const { workspaces } = useAuth();
  const location = useLocation();
  const first = workspaces[0];
  const orgId = first?.organization?.organizationId;
  const wsId = first?.workspaceId;
  if (!orgId) return <Navigate to="/onboarding" replace />;
  if (location.pathname.includes("/settings/organization")) {
    return <Navigate to={buildOrganizationPath(orgId, "settings/organization")} replace />;
  }
  if (location.pathname.includes("/settings/billing")) {
    return <Navigate to={buildOrganizationPath(orgId, "settings/billing")} replace />;
  }
  if (location.pathname.includes("/settings/access")) {
    return <Navigate to={buildOrganizationPath(orgId, "settings/access")} replace />;
  }
  if (wsId) return <Navigate to={buildWorkspacePath(orgId, wsId, "dashboard")} replace />;
  return <Navigate to={buildOrganizationPath(orgId, "onboarding")} replace />;
}

function ClientDocumentsRedirect() {
  const { organizationId, workspaceId, id } = useParams();
  if (!organizationId || !workspaceId || !id) {
    return <Navigate to="/" replace />;
  }
  return (
    <Navigate
      to={buildWorkspacePath(organizationId, workspaceId, `submissions/${id}?step=2`)}
      replace
    />
  );
}

function WorkspaceScopedLayout() {
  const { workspaceId } = useParams();
  return <WorkspaceLayout key={workspaceId || "no-workspace"} />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SyncTenantFromUrl />
        <PermissionProvider>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/" element={<Layout element={<Login />} />}></Route>
              <Route path="/register" element={<Layout element={<Register />} />}></Route>
              <Route path="/email-verification/" element={<Layout element={<EmailVerification />} />}></Route>
              <Route path="/forgot-password" element={<Layout element={<ForgotPassword />} />}></Route>
            </Route>

            <Route
              path="/onboarding"
              element={<ProtectedRoute requireWorkspace={false} />}
            >
              <Route element={<WorkspaceLayout />}>
                <Route index element={<WorkspaceOnboarding />} />
              </Route>
            </Route>

            <Route
              path="/:organizationId"
              element={
                <ProtectedRoute
                  requireWorkspace={false}
                />
              }
            >
              <Route path="dashboard" element={<OrgDashboardRedirect />} />
              <Route element={<WorkspaceLayout />}>
                <Route path="onboarding" element={<WorkspaceOnboarding />} />
              </Route>
              <Route path="profile" element={<Navigate to="account/profile" replace />} />
              <Route path="account" element={<ProtectedRoute requireWorkspace={false} />}>
                <Route element={<AccountSettingsLayout />}>
                  <Route index element={<Navigate to="profile" replace />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
              </Route>
              <Route
                path="workspaces/:workspaceId"
                element={<ProtectedRoute workspacePermissionsAny={["workspace.workspace.read"]} />}
              >
                <Route element={<WorkspaceScopedLayout />}>
                  <Route
                    path="dashboard"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.dashboard.read"]} />}
                  >
                    <Route index element={<DashboardAnalytics />} />
                  </Route>
                  <Route
                    path="submissions"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.submissions.read"]} />}
                  >
                    <Route index element={<SubmissionsPage />} />
                  </Route>
                  <Route
                    path="submissions/:id"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.submissions.read"]} />}
                  >
                    <Route index element={<SubmissionManagementPage />} />
                    <Route path="assistant" element={<ClientAssistantPage />} />
                    <Route path="documents" element={<ClientDocumentsRedirect />} />
                  </Route>
                  <Route
                    path="master-fields"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.masterfields.read"]} />}
                  >
                    <Route index element={<MasterFieldTable />} />
                  </Route>
                  <Route
                    path="template-maker"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.templates.read"]} />}
                  >
                    <Route index element={<TemplateMaker />} />
                  </Route>
                  <Route
                    path="template-maker/:templateId/manage"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.templates.read"]} />}
                  >
                    <Route index element={<TemplateDesignerPage />} />
                  </Route>
                  <Route
                    path="users"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.users.read"]} />}
                  >
                    <Route index element={<WorkspaceUsersPage />} />
                  </Route>
                  <Route
                    path="leads"
                    element={<ProtectedRoute workspacePermissionsAny={["workspace.leads.read"]} />}
                  >
                    <Route index element={<LeadsPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="settings" element={<ProtectedRoute requireWorkspace={false} />}>
                <Route element={<SettingsLayout />}>
                  <Route index element={<Navigate to="organization" replace />} />
                  <Route
                    path="organization"
                    element={
                      <ProtectedRoute
                        requireWorkspace={false}
                        organizationPermissionsAny={["organization.organization.read"]}
                      />
                    }
                  >
                    <Route index element={<OrganizationSettings />} />
                  </Route>
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute
                        requireWorkspace={false}
                        organizationPermissionsAny={["organization.members.read"]}
                      />
                    }
                  >
                    <Route index element={<OrganizationUsersSettings />} />
                  </Route>
                  <Route
                    path="billing"
                    element={
                      <ProtectedRoute
                        requireWorkspace={false}
                        organizationPermissionsAny={["organization.billing.read", "organization.billing.manage"]}
                      />
                    }
                  >
                    <Route index element={<BillingSettings />} />
                  </Route>
                  <Route
                    path="access"
                    element={
                      <ProtectedRoute
                        requireWorkspace={false}
                        organizationPermissionsAny={["organization.rbac.manage"]}
                      />
                    }
                  >
                    <Route index element={<OrganizationAccessSettings />} />
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="/workspace/*" element={<LegacyWorkspaceRedirect />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/super-admin" element={<ProtectedRoute roles={["superAdmin"]} requireWorkspace={false} />}>
              <Route element={<SuperAdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="users" element={<SuperAdminUsersPage />} />
                <Route path="organizations" element={<SuperAdminOrganizationsPage />} />
                <Route path="workspaces" element={<SuperAdminWorkspacesPage />} />
                <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
                <Route path="subscriptions/:id" element={<SuperAdminSubscriptionDetailPage />} />
                <Route path="plans" element={<SuperAdminPlansPage />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>
            <Route path="/unauthorized" element={<Layout element={<UnauthorizedPage />} />} />
            <Route path="*" element={<Layout element={<NotFoundPage />} />}></Route>
          </Routes>
        </PermissionProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
