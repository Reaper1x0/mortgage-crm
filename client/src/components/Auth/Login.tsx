import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { loginUser } from "../../redux/slices/authSlice";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { Link, useNavigate } from "react-router";
import AuthPage from "./AuthPage";
import { ButtonProps } from "../Reusable/Button";

/**
 * Login form only. Post-auth routing is owned by AppEntryGate / PublicRoute
 * so destination logic stays organization-first and single-sourced.
 */
const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const fields: FormSection["fields"] = [
    {
      fieldtype: "input",
      name: "email",
      label: "Email",
      placeholder: "Email",
      type: "email",
      required: true,
    },
    {
      fieldtype: "input",
      name: "password",
      label: "Password",
      placeholder: "Password",
      type: "password",
      required: true,
    },
  ];

  const buttons: ButtonProps[] = [
    {
      type: "submit",
      children: "Login",
      variant: "primary",
      isLoading: loading,
      disabled: loading,
    },
  ];

  const links: ButtonProps[] = [
    {
      type: "button",
      variant: "link",
      children: <Link to="/register">Don't have an account? Register</Link>,
      className: "mt-2",
    },
    {
      type: "button",
      variant: "link",
      children: "Forgot password?",
      className: "mt-1",
      onClick: () => navigate("/forgot-password"),
    },
  ];

  const sections: FormSection[] = [{ title: "", fields }];

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await dispatch(loginUser(values)).unwrap();
      // AppEntryGate remounts once memberships load and navigates organization-first.
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <AuthPage heading="Login" subheading="Enter your credentials to continue">
      <Form
        title="Login"
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
