import axios from "axios";
import { SERVER_URL } from "../constants/env.constants";
import getDeviceId from "../utils/getDeviceId";

/**
 * Single-flight session refresh and one-shot teardown.
 *
 * Logout and refresh must not go through apiClient. A 401 on those calls used
 * to re-enter the refresh interceptor, which called logout again, which 401'd
 * again — an unbounded loop that never cleared storage.
 */

let refreshPromise: Promise<string> | null = null;
let sessionEnded = false;

const apiBase = () => (SERVER_URL.endsWith("/") ? SERVER_URL.slice(0, -1) : SERVER_URL);

export const isSessionEnded = () => sessionEnded;

const readRefreshPayload = (data: unknown): { accessToken?: string; refreshToken?: string } => {
  if (!data || typeof data !== "object") return {};
  const body = data as { data?: { accessToken?: string; refreshToken?: string }; accessToken?: string; refreshToken?: string };
  return body.data ?? body;
};

async function performRefresh(): Promise<string> {
  const storedRefresh = localStorage.getItem("refreshToken");
  const accessToken = localStorage.getItem("accessToken");
  if (!storedRefresh) {
    throw new Error("No refresh token available");
  }

  const response = await axios.get(`${apiBase()}/auth/refresh`, {
    headers: {
      ...(accessToken ? { Authorization: accessToken } : {}),
      "refresh-token": storedRefresh,
      device_id: getDeviceId(),
    },
    timeout: 15000,
  });

  const payload = readRefreshPayload(response.data);
  if (!payload.accessToken) {
    throw new Error("No access token in refresh response");
  }

  localStorage.setItem("accessToken", payload.accessToken);
  if (payload.refreshToken) {
    localStorage.setItem("refreshToken", payload.refreshToken);
  }
  return payload.accessToken;
}

/** One refresh for every 401 that arrives while a refresh is already running. */
export function refreshAccessToken(): Promise<string> {
  if (sessionEnded) {
    return Promise.reject(new Error("Session ended"));
  }
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Refresh failed in a way that cannot be recovered by retrying.
 * Network and 5xx failures keep the session so a blip does not log everyone out.
 */
export function isUnrecoverableRefreshError(error: unknown): boolean {
  if (sessionEnded) return false;
  if (!axios.isAxiosError(error)) return true;
  if (!error.response) return false;
  const status = error.response.status;
  return status === 401 || status === 403 || status === 404;
}

/**
 * Clear the local session once, revoke the server session best-effort, and
 * leave the app. Further calls are no-ops so in-flight 401s cannot start
 * another logout.
 */
export function endSession(): void {
  if (sessionEnded) return;

  const accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");
  const hadSession = Boolean(accessToken || refreshToken || localStorage.getItem("user"));
  // A 401 with no local session (public pages) must not latch the client into
  // a dead state. Only a real session is cleared, and only once.
  if (!hadSession) return;

  sessionEnded = true;
  const deviceId = getDeviceId();

  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  window.dispatchEvent(new CustomEvent("auth:user-logged-out"));

  if (accessToken || refreshToken) {
    void axios
      .delete(`${apiBase()}/auth/logout`, {
        headers: {
          ...(accessToken ? { Authorization: accessToken } : {}),
          ...(refreshToken ? { "refresh-token": refreshToken } : {}),
          device_id: deviceId,
        },
        timeout: 4000,
      })
      .catch(() => undefined);
  }

  if (hadSession) {
    window.location.replace("/");
  }
}
