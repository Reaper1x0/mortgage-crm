import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { SERVER_URL } from "../constants/env.constants";
import { showErrorToast } from "../utils/errorHandler";
import { getTenantFromPath } from "../utils/tenantRouting";
import {
  endSession,
  isSessionEnded,
  isUnrecoverableRefreshError,
  refreshAccessToken,
} from "./session";

const API_BASE_URL = SERVER_URL;
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const sanitizeOrgId = (value: unknown): string | null => {
  const v = typeof value === "string" ? value.trim() : "";
  return OBJECT_ID_RE.test(v) ? v : null;
};

/**
 * 401 on these routes is a business result, not an expired access token.
 * Refreshing them (especially logout) re-enters this interceptor and loops.
 */
const NON_SESSION_401 = ["/auth/login", "/auth/logout", "/auth/refresh", "/auth/change-password"];

declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    /** Do not refresh or tear down the session when this request returns 401. */
    skipAuthRefresh?: boolean;
    /** When set, sent as X-Organization-Id (overrides path-based tenant). Use during onboarding before URL updates. */
    organizationId?: string | null;
    /** When set, sent as X-Workspace-Id (overrides path-based tenant). */
    workspaceId?: string | null;
    _retry?: boolean;
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const isNonSession401 = (url?: string) =>
  Boolean(url && NON_SESSION_401.some((path) => url.includes(path)));

/** Boolean wrapper so axios's type predicate does not narrow the error to `never`. */
const isCanceled = (error: unknown): boolean => axios.isCancel(error);

apiClient.interceptors.request.use((config) => {
  if (isSessionEnded() && !config.skipAuthRefresh) {
    return Promise.reject(new axios.CanceledError("Session ended"));
  }

  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = token;
  }

  // Let the browser set multipart boundaries — required for upload progress events.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (typeof config.headers?.set === "function") {
      config.headers.set("Content-Type", false);
    } else if (typeof config.headers?.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
    }
  } else if (config.headers) {
    const hasContentType =
      typeof config.headers.get === "function"
        ? config.headers.get("Content-Type")
        : config.headers["Content-Type"];
    if (!hasContentType) {
      if (typeof config.headers.set === "function") {
        config.headers.set("Content-Type", "application/json");
      } else {
        config.headers["Content-Type"] = "application/json";
      }
    }
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined;

    if (isSessionEnded() || isCanceled(error)) {
      return Promise.reject(error);
    }

    const skipRefresh =
      originalRequest?.skipAuthRefresh || isNonSession401(originalRequest?.url);

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !skipRefresh) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = newAccessToken;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (isUnrecoverableRefreshError(refreshError)) {
          endSession();
        }
        return Promise.reject(error);
      }
    }

    const data = error.response?.data as { reason?: string; message?: string } | undefined;
    const reasonText = String(data?.reason || data?.message || "");
    const isMissingOrgContext =
      error.response?.status === 400 &&
      (reasonText.includes("X-Organization-Id") || reasonText.includes("Active organization is required"));

    if (
      error.response?.status !== 401 &&
      !isMissingOrgContext &&
      !originalRequest?.skipErrorToast
    ) {
      showErrorToast(error);
    }

    if (
      error.response?.status === 402 &&
      (error.response?.data &&
        typeof error.response.data === "object" &&
        ((error.response.data as { code?: string }).code === "SUBSCRIPTION_REQUIRED" ||
          String((error.response.data as { reason?: string }).reason || "")
            .toLowerCase()
            .includes("subscription")))
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("billing:access-denied"));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
