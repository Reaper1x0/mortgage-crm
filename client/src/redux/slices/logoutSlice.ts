// src/redux/slices/logoutSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AuthService } from "../../service/authService";
import { addToast } from "./toasterSlice";

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
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await AuthService.logout();
      dispatch(
        addToast({
          message: response.data.message,
          type: response.data.success ? "success" : "error",
          duration: 3000,
          position: "top-right",
        })
      );
      return response.data;
    } catch (error: any) {
      dispatch(
        addToast({
          message: error.response?.data?.reason || "Error logging in!",
          type: "error",
          duration: 3000,
          position: "top-right",
        })
      );
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
