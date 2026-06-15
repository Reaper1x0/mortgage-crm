import axios from "axios";
import { SERVER_URL } from "../constants/env.constants";
import getDeviceId from "../utils/getDeviceId";
import { AuthService } from "../service/authService";
import { showErrorToast } from "../utils/errorHandler";
import { getTenantFromPath, buildOrganizationPath } from "../utils/tenantRouting";

const API_BASE_URL = SERVER_URL;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const sanitizeOrgId = (value: unknown): string | null => {
  const v = typeof value === "string" ? value.trim() : "";
  return OBJECT_ID_RE.test(v) ? v : null;
};

// Extend AxiosRequestConfig to include skipErrorToast flag
// Use this to skip automatic error toast for specific requests:
// apiClient.get('/endpoint', { skipErrorToast: true })
declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    /** When set, sent as X-Organization-Id (overrides path-based tenant). Use during onboarding before URL updates. */
    organizationId?: string | null;
    /** When set, sent as X-Workspace-Id (overrides path-based tenant). */
    workspaceId?: string | null;
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

// Request interceptor to add access token and active workspace (tenant) context
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = token;
  }
  const pathTenant = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
  const organizationId = sanitizeOrgId(config.organizationId ?? pathTenant.organizationId);
  const workspaceId = sanitizeOrgId(config.workspaceId ?? pathTenant.workspaceId);
  if (organizationId) {
    config.headers["X-Organization-Id"] = organizationId;
  } else {
    delete (config.headers as Record<string, unknown>)["X-Organization-Id"];
  }
  if (workspaceId) {
    config.headers["X-Workspace-Id"] = workspaceId;
  } else {
    delete (config.headers as Record<string, unknown>)["X-Workspace-Id"];
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
        const refreshStatus = refreshError?.response?.status;
        const shouldLogout =
          refreshStatus === 401 ||
          refreshStatus === 403 ||
          refreshStatus === 404 ||
          refreshStatus === 500;

        if (shouldLogout) {
          await AuthService.logout();
        }
        // For other errors (network, 500, etc.), just reject the original request without logging out
        return Promise.reject(error);
      }
    }

    const data = error.response?.data as { reason?: string; message?: string } | undefined;
    const reasonText = String(data?.reason || data?.message || "");
    const isMissingOrgContext =
      error.response?.status === 400 &&
      (reasonText.includes("X-Organization-Id") || reasonText.includes("Active organization is required"));

    // Show error toast unless explicitly skipped
    // Skip toasts for 401 errors (handled above), missing tenant context (client routing bug — avoid floods),
    // and if skipErrorToast flag is set
    if (
      error.response?.status !== 401 &&
      !isMissingOrgContext &&
      !originalRequest?.skipErrorToast
    ) {
      showErrorToast(error);
    }

    if (
      error.response?.status === 402 &&
      error.response?.data?.code === "SUBSCRIPTION_REQUIRED"
    ) {
      const { organizationId } = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
      window.location.href = organizationId
        ? buildOrganizationPath(organizationId, "settings/billing")
        : "/pricing";
    }

    return Promise.reject(error);
  }
);

export default apiClient;
