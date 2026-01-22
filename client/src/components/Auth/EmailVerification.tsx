import { useDispatch } from "react-redux";
import { verifyEmailOtp } from "../../redux/slices/otpEmailSlice";
import { AppDispatch } from "../../redux/store";
import { useNavigate } from "react-router";
import OtpInput from "../Reusable/Inputs/OtpInput";
import AuthPage from "./AuthPage";
import { useLanguage } from "../../context/LanguageContext";

export default function EmailVerification() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (otp: string) => {
    const result = await dispatch(verifyEmailOtp(otp)).unwrap();
    if (result) navigate("/");
  };

  return (
    <AuthPage heading={t("email_verification") || "Email Verification"} subheading={t("verify_your_email") || ""}>
      <OtpInput
        title={t("verify_email") || "Verify your email"}
        subtitle={t("enter_email_code") || "Enter the 6-digit code sent to your email."}
        onSubmit={handleSubmit}
        isLoading={false}
      />
    </AuthPage>
  );
}
