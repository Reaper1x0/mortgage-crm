import axios from "axios";
import { SERVER_URL } from "../constants/env.constants";
import apiClient from "../api/apiClient";
import { otpResetPasswordPayload } from "../redux/slices/otpPasswordResetSlice";
import { ResetPasswordPayload } from "../redux/slices/resetPasswordSlice";
import getDeviceId from "../utils/getDeviceId";

export const AuthService = {
  register: async (data: Record<string, any>) => {
    return await axios.post(`${SERVER_URL}auth/register`, data);
  },

  login: async (data: Record<string, any>) => {
    const payload = {
      email: data.email,
      password: data.password,
    };
    return await axios.post(`${SERVER_URL}auth/login`, payload, {
      headers: { device_id: getDeviceId() },
    });
  },
  verifyEmailOtp: async (otp: string) => {
    return await apiClient.post(`${SERVER_URL}auth/verify-email`, { otp });
  },
  verifyPasswordOtp: async (otpData: otpResetPasswordPayload) => {
    return await axios.post(
      `${SERVER_URL}auth/reset-password-otp-verification`,
      otpData
    );
  },
  forgotPassword: async (email: string) => {
    return await axios.post(`${SERVER_URL}auth/forget-password`, { email });
  },
  resetPassword: async (payload: ResetPasswordPayload) => {
    return await axios.put(`${SERVER_URL}auth/reset-password`, payload);
  },
  logout: async () => {
    try {
      await axios.delete(`${SERVER_URL}auth/logout`, {
        headers: { device_id: getDeviceId() },
      });
    } catch (err) {
      console.error("Logout API failed, but clearing local data…", err);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  },

  getUsernameAvailibility: async (username: String) => {
    if (username.length > 4)
      return await apiClient.get(
        `${SERVER_URL}auth/username-availbility/${username}`
      );
  },
};
