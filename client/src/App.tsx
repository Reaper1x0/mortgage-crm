import { BrowserRouter, Route, Routes } from "react-router";
import Register from "./components/Auth/Register";
import Login from "./components/Auth/Login";
import Layout from "./components/Layout/Layout";
import EmailVerification from "./components/Auth/EmailVerification";
import ForgotPassword from "./components/Auth/ForgotPassword";
import NotFoundPage from "./components/Static/NotFoundPage";
import Profile from "./components/Auth/Profile";
import MasterFieldTable from "./components/MasterField/MasterFieldTable";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminLayout from "./components/Layout/Adminlayout";
import SubmissionsPage from "./components/Submissions/SubmissionsPage";
import SubmissionManagementPage from "./components/Submissions/SubmissionManagementPage";
import TemplateMaker from "./components/TemplateMaker/TemplatesPage";
import TemplateDesignerPage from "./components/TemplateMaker/TemplateDesignerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
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
        <Route
          path="/profile"
          element={<Layout element={<Profile />} />}
        ></Route>

        <Route path="/workspace" element={<AdminLayout />}>
          <Route element={<ProtectedRoute roles={["Admin"]} />}>
            <Route path="submissions" element={<SubmissionsPage />}></Route>
            <Route
              path="submissions/:id"
              element={<SubmissionManagementPage />}
            ></Route>
            <Route path="master-fields" element={<MasterFieldTable />}></Route>
            <Route path="template-maker" element={<TemplateMaker />}></Route>
            <Route path="template-maker/:templateId/manage" element={<TemplateDesignerPage />}></Route>
          </Route>
        </Route>
        <Route path="*" element={<Layout element={<NotFoundPage />} />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
