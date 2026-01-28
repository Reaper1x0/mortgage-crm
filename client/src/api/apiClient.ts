import axios from "axios";
import { SERVER_URL } from "../constants/env.constants";
import getDeviceId from "../utils/getDeviceId";
import { AuthService } from "../service/authService";
import { showErrorToast } from "../utils/errorHandler";

const API_BASE_URL = SERVER_URL;

// Extend AxiosRequestConfig to include skipErrorToast flag
// Use this to skip automatic error toast for specific requests:
// apiClient.get('/endpoint', { skipErrorToast: true })
declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to refresh the token
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    const accessToken = localStorage.getItem("accessToken");
    const device_id = getDeviceId();
    if (!refreshToken) throw new Error("No refresh token available");

    const response = await axios.get(`${API_BASE_URL}auth/refresh`, {
      headers: {
        Authorization: accessToken,
        "refresh-token": refreshToken,
        device_id: device_id
      },
    });
    const newAccessToken = response.data.accessToken;

    localStorage.setItem("accessToken", newAccessToken);
    return newAccessToken;
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw error;
  }
};

// Request interceptor to add access token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// Response interceptor to handle 401 errors and show error toasts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshToken();
        originalRequest.headers.Authorization = newAccessToken;
        return apiClient(originalRequest); // Retry the request with new token
      } catch (refreshError) {
        console.error("Token refresh error:", refreshError);
        AuthService.logout();
        return Promise.reject(refreshError);
      }
    }

    // Show error toast unless explicitly skipped
    // Skip toasts for 401 errors (handled above) and if skipErrorToast flag is set
    if (
      error.response?.status !== 401 &&
      !originalRequest?.skipErrorToast
    ) {
      showErrorToast(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
