import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import Form from "../Reusable/Inputs/Form";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "../../context/LanguageContext";
import { forgotPassword } from "../../redux/slices/forgotPasswordSlice";
import { verifyPasswordOtp } from "../../redux/slices/otpPasswordResetSlice";
import { resetPassword } from "../../redux/slices/resetPasswordSlice";
import AuthPage from "./AuthPage";
import OtpInput from "../Reusable/Inputs/OtpInput";

const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState<string>("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { loading: forgotLoading, error: forgotError } = useSelector((state: RootState) => state.forgotPassword);
  const { loading: otpLoading } = useSelector((state: RootState) => state.otp);
  const { loading: resetLoading, error: resetError } = useSelector((state: RootState) => state.resetPassword);

  const handleEmailSubmit = async (values: Record<string, any>) => {
    const result = await dispatch(forgotPassword(values.email)).unwrap();
    if (result) {
      setEmail(values.email);
      setStep("otp");
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    const result = await dispatch(verifyPasswordOtp({ otp, email })).unwrap();
    if (result) setStep("reset");
  };

  const handleResetPassword = async (values: Record<string, any>) => {
    setLocalErrors({});
    if (values.newPassword !== values.confirmPassword) {
      setLocalErrors({ confirmPassword: t("passwords_do_not_match") || "Passwords do not match" });
      return;
    }

    const result = await dispatch(resetPassword({ email, newPassword: values.newPassword })).unwrap();
    if (result) navigate("/");
  };

  return (
    <AuthPage heading={t("forgot_password")} subheading={t("reset_your_password") || ""}>
      {step === "email" && (
        <Form
          title={t("forgot_password")}
          subtitle={"Enter email to recieve code"}
          sections={[
            {
              fields: [
                { fieldtype: "input", name: "email", label: t("email"), placeholder: t("enter_your_email"), type: "email", required: true },
              ],
            },
          ]}
          buttons={[
            { type: "submit", children: t("send_reset_link"), variant: "primary", isLoading: forgotLoading, disabled: forgotLoading },
          ]}
          links={[
            { type: "button", variant: "link", children: <Link to="/">{t("back_to_login")}</Link>, className: "mt-2" },
          ]}
          onSubmit={handleEmailSubmit}
          errors={forgotError ? { email: forgotError } : {}}
          defaultValues={{}}
        />
      )}

      {step === "otp" && (
        <OtpInput
          title={t("verify_otp") || "Verify OTP"}
          subtitle={t("enter_code_sent") || "Enter the code we sent you."}
          onSubmit={handleOtpSubmit}
          isLoading={otpLoading}
        />
      )}

      {step === "reset" && (
        <Form
          title={t("reset_password")}
          subtitle={t("choose_new_password") || ""}
          sections={[
            {
              fields: [
                { fieldtype: "input", name: "newPassword", label: t("new_password"), placeholder: t("new_password"), type: "password", required: true },
                { fieldtype: "input", name: "confirmPassword", label: t("confirm_password"), placeholder: t("confirm_password"), type: "password", required: true },
              ],
            },
          ]}
          buttons={[
            { type: "submit", children: t("reset_password"), variant: "primary", isLoading: resetLoading, disabled: resetLoading },
          ]}
          onSubmit={handleResetPassword}
          errors={{ ...(resetError ? { newPassword: resetError } : {}), ...localErrors }}
          defaultValues={{}}
        />
      )}
    </AuthPage>
  );
};

export default ForgotPassword;
