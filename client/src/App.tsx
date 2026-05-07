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
import TemplateMaker from "./components/TemplateMaker/TemplatesPage";
import TemplateDesignerPage from "./components/TemplateMaker/TemplateDesignerPage";
import UsersPage from "./components/Users/UsersPage";
import DashboardAnalytics from "./components/Dashboard/DashboardAnalytics";
import LeadsPage from "./components/Leads/LeadsPage";
import WorkspaceOnboarding from "./components/Workspace/WorkspaceOnboarding";
import SettingsLayout from "./components/Layout/SettingsLayout";
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
import PricingPage from "./components/Billing/PricingPage";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "./utils/tenantRouting";

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
  if (wsId) return <Navigate to={buildWorkspacePath(orgId, wsId, "dashboard")} replace />;
  return <Navigate to={buildOrganizationPath(orgId, "onboarding")} replace />;
}

function WorkspaceScopedLayout() {
  const { workspaceId } = useParams();
  return <WorkspaceLayout key={workspaceId || "no-workspace"} />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<Layout element={<Login />} />}></Route>
          <Route
            path="/register"
            element={<Layout element={<Register />} />}
          ></Route>
          <Route
            path="/email-verification/"
            element={<Layout element={<EmailVerification />} />}
          ></Route>
          <Route
            path="/forgot-password"
            element={<Layout element={<ForgotPassword />} />}
          ></Route>
        </Route>

        <Route path="/onboarding" element={<ProtectedRoute roles={["Admin", "Agent", "Viewer"]} requireWorkspace={false} />}>
          <Route element={<WorkspaceLayout />}>
            <Route index element={<WorkspaceOnboarding />} />
          </Route>
        </Route>

        <Route path="/:organizationId" element={<ProtectedRoute roles={["Admin", "Agent", "Viewer"]} requireWorkspace={false} />}>
          <Route path="dashboard" element={<OrgDashboardRedirect />} />
          <Route path="onboarding" element={<WorkspaceOnboarding />} />
          <Route path="profile" element={<WorkspaceLayout />}>
            <Route index element={<Profile />} />
          </Route>
          <Route path="workspaces/:workspaceId" element={<WorkspaceScopedLayout />}>
            <Route path="dashboard" element={<DashboardAnalytics />}></Route>
            <Route path="submissions" element={<SubmissionsPage />}></Route>
            <Route path="submissions/:id" element={<SubmissionManagementPage />}></Route>
            <Route path="master-fields" element={<MasterFieldTable />}></Route>
            <Route path="template-maker" element={<TemplateMaker />}></Route>
            <Route path="template-maker/:templateId/manage" element={<TemplateDesignerPage />}></Route>
            <Route path="users" element={<UsersPage />}></Route>
            <Route path="leads" element={<LeadsPage />}></Route>
          </Route>
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="organization" replace />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="billing" element={<BillingSettings />} />
          </Route>
        </Route>
        <Route path="/workspace/*" element={<LegacyWorkspaceRedirect />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route
          path="/super-admin"
          element={<ProtectedRoute roles={["superAdmin"]} requireWorkspace={false} />}
        >
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
