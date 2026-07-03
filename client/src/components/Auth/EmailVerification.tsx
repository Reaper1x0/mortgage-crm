import { useDispatch } from "react-redux";
import { verifyEmailOtp } from "../../redux/slices/otpEmailSlice";
import { AppDispatch } from "../../redux/store";
import { useNavigate } from "react-router";
import OtpInput from "../Reusable/Inputs/OtpInput";
import AuthPage from "./AuthPage";

export default function EmailVerification() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleSubmit = async (otp: string) => {
    const result = await dispatch(verifyEmailOtp(otp)).unwrap();
    if (result) navigate("/");
  };

  return (
    <AuthPage heading="Email Verification" subheading="Verify your email">
      <OtpInput
        title="Verify your email"
        subtitle="Enter the 6-digit code sent to your email."
        onSubmit={handleSubmit}
        isLoading={false}
      />
    </AuthPage>
  );
}
