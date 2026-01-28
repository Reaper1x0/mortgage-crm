import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";
import { addToast } from "./toasterSlice";

// Define the OTP state type
interface OtpState {
  otp: string;
  isVerified: boolean;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: OtpState = {
  otp: "",
  isVerified: false,
  loading: false,
  error: null,
};

export interface otpResetPasswordPayload {
  otp: string;
  email: string;
}
// Async thunk for OTP verification
export const verifyPasswordOtp = createAsyncThunk<
  boolean, // Return type
  otpResetPasswordPayload, // Argument type (OTP code)
  { rejectValue: string }
>("auth/verifyOtp", async (otpData, { dispatch }) => {
  try {
    const response = await AuthService.verifyPasswordOtp(otpData);
    // Show success toast only
    if (response.data.success) {
      dispatch(
        addToast({
          message: response.data.message,
          type: "success",
          duration: 3000,
          position: "top-right",
        })
      );
    }
    return response?.data?.success ? true : false;
  } catch (error: any) {
    console.error("OTP verification error:", error);
    // Error toast is handled automatically by centralized error handler
    return false;
  }
});

const otpPasswordSlice = createSlice({
  name: "otp",
  initialState,
  reducers: {
    setOtp: (state, action: PayloadAction<string>) => {
      state.otp = action.payload;
    },
    resetOtp: (state) => {
      state.otp = "";
      state.isVerified = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(verifyPasswordOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPasswordOtp.fulfilled, (state) => {
        state.isVerified = true;
        state.loading = false;
      })
      .addCase(verifyPasswordOtp.rejected, (state, action) => {
        state.error = action.payload || "OTP verification failed";
        state.loading = false;
      });
  },
});

// Export actions
export const { setOtp, resetOtp } = otpPasswordSlice.actions;

// Export reducer
export default otpPasswordSlice.reducer;
