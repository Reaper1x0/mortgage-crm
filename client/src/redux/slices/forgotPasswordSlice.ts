import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";
import { addToast } from "./toasterSlice";

// Define the Forgot Password state type
interface ForgotPasswordState {
  email: string;
  loading: boolean;
  success: boolean;
  error: string | null;
}

// Initial state
const initialState: ForgotPasswordState = {
  email: "",
  loading: false,
  success: false,
  error: null,
};

// Async thunk for forgot password request
export const forgotPassword = createAsyncThunk<
  boolean, // Return type
  string, // Argument type (email)
  { rejectValue: string }
>("auth/forgotPassword", async (email, { dispatch, rejectWithValue }) => {
  try {
    const response = await AuthService.forgotPassword(email);
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
    return response?.data?.success;
  } catch (error: any) {
    // Error toast is handled automatically by centralized error handler
    return rejectWithValue(error.message);
  }
});

const forgotPasswordSlice = createSlice({
  name: "forgotPassword",
  initialState,
  reducers: {
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    resetForgotPasswordState: (state) => {
      state.email = "";
      state.success = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.success = true;
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.error = action.payload || "Forgot password request failed";
        state.loading = false;
      });
  },
});

// Export actions
export const { setEmail, resetForgotPasswordState } = forgotPasswordSlice.actions;

// Export reducer
export default forgotPasswordSlice.reducer;
