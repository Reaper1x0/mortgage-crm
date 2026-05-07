import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { loginUser } from "../../redux/slices/authSlice";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { Link, useNavigate, useLocation } from "react-router";
import AuthPage from "./AuthPage";
import { useLanguage } from "../../context/LanguageContext";
import { ButtonProps } from "../Reusable/Button";
import { useAuth } from "../../context/AuthContext";
import { buildOrganizationPath, buildWorkspacePath } from "../../utils/tenantRouting";

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const { user, isAuthenticated, workspaces } = useAuth();
  const hasNavigated = useRef(false);

  const fields: FormSection["fields"] = [
    {
      fieldtype: "input",
      name: "email",
      label: t("email"),
      placeholder: t("email"),
      type: "email",
      required: true,
    },
    {
      fieldtype: "input",
      name: "password",
      label: t("password"),
      placeholder: t("password"),
      type: "password",
      required: true,
    },
  ];

  const buttons: ButtonProps[] = [
    {
      type: "submit",
      children: t("login"),
      variant: "primary",
      isLoading: loading,
      disabled: loading,
    },
  ];

  const links: ButtonProps[] = [
    {
      type: "button",
      variant: "link",
      children: <Link to="/register">{t("dont_have_account")}</Link>,
      className: "mt-2",
    },
    {
      type: "button",
      variant: "link",
      children: t("forgot_password?"),
      className: "mt-1",
      onClick: () => navigate("/forgot-password"),
    },
  ];

  const sections: FormSection[] = [{ title: "", fields }];

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await dispatch(loginUser(values)).unwrap();
      // Navigation will be handled by useEffect below when user becomes available
    } catch (error) {
      // Error is handled by Redux
      console.error("Login failed:", error);
    }
  };

  // Navigate after successful login when user becomes available
  useEffect(() => {
    // Only navigate if we're still on the login page and haven't navigated yet
    if (isAuthenticated && user && location.pathname === "/" && !hasNavigated.current) {
      hasNavigated.current = true;
      if (user.isEmailVerified) {
        if (user.role === "superAdmin") {
          navigate("/super-admin/dashboard", { replace: true });
          return;
        }
        const firstWorkspace = workspaces[0];
        const orgId = firstWorkspace?.organization?.organizationId;
        const wsId = firstWorkspace?.workspaceId;
        if (orgId && wsId) {
          navigate(buildWorkspacePath(orgId, wsId, "dashboard"), { replace: true });
          return;
        }
        if (orgId) {
          navigate(buildOrganizationPath(orgId, "dashboard"), { replace: true });
          return;
        }
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/email-verification", { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location.pathname, workspaces]);

  return (
    <AuthPage heading={t("login")} subheading={t("enter_your_credentials") || ""}>
      <Form
        title={t("login")}
        subtitle={"Welcome Back"}
        sections={sections}
        buttons={buttons}
        links={links}
        onSubmit={handleSubmit}
        errors={error ? { form: error } : {}}
        defaultValues={{}}
      />
    </AuthPage>
  );
};

export default Login;
