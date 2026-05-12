// src/redux/slices/logoutSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";

interface LogoutState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

const initialState: LogoutState = {
  loading: false,
  error: null,
  success: false,
};

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
      return true;
    } catch (error: any) {
      // Error toast is skipped for logout (skipErrorToast: true in AuthService)
      return rejectWithValue(
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  }
);

const logoutSlice = createSlice({
  name: "logout",
  initialState,
  reducers: {
    resetLogoutState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.success = true;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetLogoutState } = logoutSlice.actions;
export default logoutSlice.reducer;
