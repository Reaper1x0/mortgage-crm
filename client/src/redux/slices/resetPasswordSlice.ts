import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";
import { addToast } from "./toasterSlice";

// Define the Reset Password state type
interface ResetPasswordState {
  newPassword: string;
  loading: boolean;
  success: boolean;
  error: string | null;
}

// Initial state
const initialState: ResetPasswordState = {
  newPassword: "",
  loading: false,
  success: false,
  error: null,
};
export interface ResetPasswordPayload {
    email: string; 
    newPassword: string
}
// Async thunk for reset password request
export const resetPassword = createAsyncThunk<
  boolean, // Return type
  ResetPasswordPayload, // Argument type (newPassword)
  { rejectValue: string }
>("auth/resetPassword", async (payload, { dispatch, rejectWithValue }) => {
  try {
    const response = await AuthService.resetPassword(payload);
    dispatch(
      addToast({
        message: response.data.message,
        type: response.data.success ? "success" : "error",
        duration: 3000,
        position: "top-right",
      })
    );
    return response?.data?.success;
  } catch (error: any) {
    dispatch(
      addToast({
        message: error.response?.data?.reason || "Error resetting new password!",
        type: "error",
        duration: 3000,
        position: "top-right",
      })
    );
    return rejectWithValue(error.message);
  }
});

const resetPasswordSlice = createSlice({
  name: "resetPassword",
  initialState,
  reducers: {
    setNewPassword: (state, action: PayloadAction<string>) => {
      state.newPassword = action.payload;
    },
    resetPasswordState: (state) => {
      state.newPassword = "";
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.success = true;
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.error = action.payload || "Reset password request failed";
        state.loading = false;
      });
  },
});

// Export actions
export const { setNewPassword, resetPasswordState } = resetPasswordSlice.actions;

// Export reducer
export default resetPasswordSlice.reducer;
