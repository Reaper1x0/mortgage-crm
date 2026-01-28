import React, { useState } from "react";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import AuthPage from "./AuthPage";
import { AuthService } from "../../service/authService";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";

const Register: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [usernameError, setUserNameError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const dispatch = useDispatch();

  const handleChange = async (username: String) => {
    try {
      await AuthService.getUsernameAvailibility(username);
      setUserNameError(undefined);
    } catch {
      setUserNameError("Username not available");
    }
  };

  const fields: FormSection["fields"] = [
    { fieldtype: "input", name: "fullName", label: t("full_name"), placeholder: t("full_name"), type: "text", required: true },
    { fieldtype: "input", name: "username", label: t("username"), placeholder: t("username"), type: "text", required: true, handlechange: handleChange },
    { fieldtype: "input", name: "email", label: t("email"), placeholder: t("email"), type: "email", required: true },
    { fieldtype: "input", name: "password", label: t("password"), placeholder: t("password"), type: "password", required: true },
  ];

  const sections: FormSection[] = [{ title: "", fields }];

  const handleSubmit = async (values: Record<string, any>) => {
    setLoading(true);
    try {
      const response = await AuthService.register(values);
      if (response.data.success) {
        dispatch(addToast({ message: response?.data.message, type: "success", duration: 3000, position: "top-right" }));
        navigate("/");
      }
    } catch (err: unknown) {
      // Error toast is handled automatically by centralized error handler
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage heading={t("signup")} subheading={t("create_account") || ""}>
      <Form
        title={t("signup")}
        subtitle={"Lets Get Started"}
        sections={sections}
        buttons={[
          { type: "submit", children: t("signup"), variant: "primary", isLoading: loading, disabled: loading },
        ]}
        links={[
          { type: "button", variant: "link", children: <Link to="/">{t("already_registered")}</Link>, className: "mt-2" },
        ]}
        onSubmit={handleSubmit}
        errors={usernameError ? { username: usernameError } : {}}
        defaultValues={{}}
      />
    </AuthPage>
  );
};

export default Register;
