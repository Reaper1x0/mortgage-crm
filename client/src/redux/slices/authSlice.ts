import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";
import { User } from "../../types/auth.types";
import { addToast } from "./toasterSlice";

// Auth State Type
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

// Initial State
const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem("accessToken") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  loading: false,
  error: null,
};

// Login User
export const loginUser = createAsyncThunk(
  "auth/login",
  async (data: Record<string, any>, { dispatch, rejectWithValue }) => {
    try {
      const response = await AuthService.login(data);
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
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    } catch (error: any) {
      // Error toast is handled automatically by centralized error handler
      return rejectWithValue(error);
    }
  }
);

// Logout User
export const logoutUser = createAsyncThunk("auth/logout", async () => {
  await AuthService.logout();
  return null;
});

// **Auth Slice**
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(
      loginUser.fulfilled,
      (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      }
    );
    builder.addCase(loginUser.rejected, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.error = action.payload.reason;
    });

    // Logout
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    });
  },
});

export default authSlice.reducer;
