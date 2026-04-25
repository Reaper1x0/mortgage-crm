import { BrowserRouter, Navigate, Route, Routes } from "react-router";
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
import WorkspaceSettings from "./components/Workspace/WorkspaceSettings";
import SuperAdminLayout from "./components/Layout/SuperAdminLayout";
import SuperAdminUsersPage from "./components/SuperAdmin/SuperAdminUsersPage";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard";
import { AuthProvider } from "./context/AuthContext";

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

        <Route path="/workspace" element={<ProtectedRoute roles={["Admin", "Agent", "Viewer"]} />}>
          <Route element={<WorkspaceLayout />}>
            <Route index element={<Navigate to="dashboard/analytics" replace />} />
            <Route path="onboarding" element={<WorkspaceOnboarding />} />
            <Route path="submissions" element={<SubmissionsPage />}></Route>
            <Route
              path="submissions/:id"
              element={<SubmissionManagementPage />}
            ></Route>
            <Route path="master-fields" element={<MasterFieldTable />}></Route>
            <Route path="template-maker" element={<TemplateMaker />}></Route>
            <Route path="template-maker/:templateId/manage" element={<TemplateDesignerPage />}></Route>
            <Route path="users" element={<UsersPage />}></Route>
            <Route path="leads" element={<LeadsPage />}></Route>
            <Route path="dashboard/analytics" element={<DashboardAnalytics />}></Route>
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="organization" replace />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="workspace" element={<WorkspaceSettings />} />
          </Route>
        </Route>
        <Route
          path="/super-admin"
          element={<ProtectedRoute roles={["superAdmin"]} requireWorkspace={false} />}
        >
          <Route element={<SuperAdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<SuperAdminDashboard />} />
            <Route path="users" element={<SuperAdminUsersPage />} />
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
