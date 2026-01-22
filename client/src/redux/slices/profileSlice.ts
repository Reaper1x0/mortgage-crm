import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { UserService } from "../../service/userService";
import { User } from "../../types/auth.types";

export interface ProfileState {
    user: User | null;
    loading: boolean;
    error: string | null;
  }

// Initial State
const initialState: ProfileState = {
  user: null,
  loading: false,
  error: null,
};

// Async Thunk for Fetching Profile
export const fetchProfile = createAsyncThunk(
  "auth/profile",
  async (_, { rejectWithValue }) => {
    try {
      const data = await UserService.getProfile();
      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch profile");
    }
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default profileSlice.reducer;
