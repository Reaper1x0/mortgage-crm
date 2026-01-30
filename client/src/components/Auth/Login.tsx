import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import { loginUser } from "../../redux/slices/authSlice";
import Form, { FormSection } from "../Reusable/Inputs/Form";
import { Link, useNavigate } from "react-router";
import AuthPage from "./AuthPage";
import { useLanguage } from "../../context/LanguageContext";
import { ButtonProps } from "../Reusable/Button";

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

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
    const result = await dispatch(loginUser(values)).unwrap();
    if (result?.user) {
      if (result.user.isEmailVerified) navigate("/workspace/dashboard/analytics");
      else navigate("/email-verification");
    }
  };

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
