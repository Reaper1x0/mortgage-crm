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

    // Construct URL properly - ensure no double slashes and correct path
    const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const refreshUrl = `${baseUrl}/auth/refresh`;
    
    const response = await axios.get(refreshUrl, {
      headers: {
        Authorization: accessToken,
        "refresh-token": refreshToken,
        device_id: device_id
      },
    });
    
    // Handle both response.data.accessToken and response.data.data.accessToken
    const responseData = response.data?.data || response.data;
    const newAccessToken = responseData?.accessToken;
    const newRefreshToken = responseData?.refreshToken;

    if (!newAccessToken) {
      throw new Error("No access token in refresh response");
    }

    localStorage.setItem("accessToken", newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem("refreshToken", newRefreshToken);
    }
    
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
    
    // Skip token refresh if this is already a refresh token request to avoid infinite loops
    const isRefreshRequest = originalRequest?.url?.includes('auth/refresh');
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshToken();
        originalRequest.headers.Authorization = newAccessToken;
        return apiClient(originalRequest); // Retry the request with new token
      } catch (refreshError: any) {
        console.error("Token refresh error:", refreshError);
        // Logout if refresh token endpoint returns 401 (both tokens are invalid) or 404 (endpoint not found/invalid session)
        // Also logout on 403 (forbidden) as it indicates invalid/expired tokens
        const shouldLogout = 
          refreshError?.response?.status === 401 || 
          refreshError?.response?.status === 404 || 
          refreshError?.response?.status === 403;
        
        if (shouldLogout) {
          AuthService.logout();
        }
        // For other errors (network, 500, etc.), just reject the original request without logging out
        return Promise.reject(error);
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
