import axios from "axios";
import { SERVER_URL } from "../constants/env.constants";
import apiClient from "../api/apiClient";
import { endSession } from "../api/session";
import { otpResetPasswordPayload } from "../redux/slices/otpPasswordResetSlice";
import { ResetPasswordPayload } from "../redux/slices/resetPasswordSlice";
import getDeviceId from "../utils/getDeviceId";
import { axiosWithErrorHandling } from "../utils/apiWrapper";

export const AuthService = {
  register: async (data: Record<string, any>) => {
    return await axiosWithErrorHandling(() =>
      axios.post(`${SERVER_URL}auth/register`, data)
    );
  },

  login: async (data: Record<string, any>) => {
    const payload = {
      email: data.email,
      password: data.password,
    };
    return await axiosWithErrorHandling(() =>
      axios.post(`${SERVER_URL}auth/login`, payload, {
        headers: { device_id: getDeviceId() },
      })
    );
  },
  verifyEmailOtp: async (otp: string) => {
    return await apiClient.post("/auth/verify-email", { otp });
  },
  verifyPasswordOtp: async (otpData: otpResetPasswordPayload) => {
    return await axiosWithErrorHandling(() =>
      axios.post(
        `${SERVER_URL}auth/reset-password-otp-verification`,
        otpData
      )
    );
  },
  forgotPassword: async (email: string) => {
    return await axiosWithErrorHandling(() =>
      axios.post(`${SERVER_URL}auth/forget-password`, { email })
    );
  },
  resetPassword: async (payload: ResetPasswordPayload) => {
    return await axiosWithErrorHandling(() =>
      axios.put(`${SERVER_URL}auth/reset-password`, payload)
    );
  },
  logout: async () => {
    // Clears storage first and revokes the server session outside apiClient,
    // so a 401 from logout cannot start another refresh.
    endSession();
  },

  getUsernameAvailibility: async (username: string) => {
    const trimmed = String(username || "").trim();
    if (trimmed.length < 3) return null;
    return await apiClient.get(`/auth/username-availability/${encodeURIComponent(trimmed)}`, {
      skipErrorToast: true,
    });
  },
};
