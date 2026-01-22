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

// Async thunk for OTP verification
export const verifyEmailOtp = createAsyncThunk<
  boolean, // Return type
  string, // Argument type (OTP code)
  { rejectValue: string }
>("auth/verifyOtp", async (otp, { dispatch, rejectWithValue }) => {
  try {
    const response = await AuthService.verifyEmailOtp(otp);
    dispatch(
      addToast({
        message: response.data.message,
        type: response.data.success ? "success" : "error",
        duration: 3000,
        position: "top-right",
      })
    );
    return response?.data?.success ? true : false;
  } catch (error: any) {
    dispatch(
      addToast({
        message: error.response?.data?.reason || "Error logging in!",
        type: "error",
        duration: 3000,
        position: "top-right",
      })
    );
    return rejectWithValue(error.message);
  }
});

const otpEmailSlice = createSlice({
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
      .addCase(verifyEmailOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmailOtp.fulfilled, (state) => {
        state.isVerified = true;
        state.loading = false;
      })
      .addCase(verifyEmailOtp.rejected, (state, action) => {
        state.error = action.payload || "OTP verification failed";
        state.loading = false;
      });
  },
});

// Export actions
export const { setOtp, resetOtp } = otpEmailSlice.actions;

// Export reducer
export default otpEmailSlice.reducer;
