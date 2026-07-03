import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../redux/store";
import Form from "../Reusable/Inputs/Form";
import { Link, useNavigate } from "react-router";
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
      setLocalErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    const result = await dispatch(resetPassword({ email, newPassword: values.newPassword })).unwrap();
    if (result) navigate("/");
  };

  return (
    <AuthPage heading="Forgot password" subheading="Reset your password">
      {step === "email" && (
        <Form
          title="Forgot password"
          subtitle={"Enter email to recieve code"}
          sections={[
            {
              fields: [
                { fieldtype: "input", name: "email", label: "Email", placeholder: "Enter your email", type: "email", required: true },
              ],
            },
          ]}
          buttons={[
            { type: "submit", children: "Send reset link", variant: "primary", isLoading: forgotLoading, disabled: forgotLoading },
          ]}
          links={[
            { type: "button", variant: "link", children: <Link to="/">Back to Login</Link>, className: "mt-2" },
          ]}
          onSubmit={handleEmailSubmit}
          errors={forgotError ? { email: forgotError } : {}}
          defaultValues={{}}
        />
      )}

      {step === "otp" && (
        <OtpInput
          title="Verify OTP"
          subtitle="Enter the code we sent you."
          onSubmit={handleOtpSubmit}
          isLoading={otpLoading}
        />
      )}

      {step === "reset" && (
        <Form
          title="Reset password"
          subtitle="Choose a new password"
          sections={[
            {
              fields: [
                { fieldtype: "input", name: "newPassword", label: "New Password", placeholder: "New Password", type: "password", required: true },
                { fieldtype: "input", name: "confirmPassword", label: "Confirm Password", placeholder: "Confirm Password", type: "password", required: true },
              ],
            },
          ]}
          buttons={[
            { type: "submit", children: "Reset password", variant: "primary", isLoading: resetLoading, disabled: resetLoading },
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
