import { SERVER_URL } from "../constants/env.constants";
import getDeviceId from "./getDeviceId";
import { getTenantFromPath } from "./tenantRouting";
import {
  applyUploadProgressEvent,
  createUploadProgress,
  type FileUploadProgressCallback,
} from "./uploadProgress";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function sanitizeOrgId(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  return OBJECT_ID_RE.test(v) ? v : null;
}

export type UploadFormDataOptions = {
  method?: "POST" | "PUT" | "PATCH";
  path: string;
  formData: FormData;
  file: File;
  onProgress?: FileUploadProgressCallback;
  organizationId?: string | null;
  workspaceId?: string | null;
};

export class UploadRequestError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "UploadRequestError";
    this.status = status;
    this.payload = payload;
  }
}

function buildUploadUrl(path: string): string {
  const base = SERVER_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${base}/${normalizedPath}`;
}

function buildUploadHeaders(options: UploadFormDataOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("accessToken");
  if (token) headers.Authorization = token;

  const pathTenant = getTenantFromPath(typeof window !== "undefined" ? window.location.pathname : "");
  const organizationId = sanitizeOrgId(options.organizationId ?? pathTenant.organizationId);
  const workspaceId = sanitizeOrgId(options.workspaceId ?? pathTenant.workspaceId);

  if (organizationId) headers["X-Organization-Id"] = organizationId;
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;

  const deviceId = getDeviceId();
  if (deviceId) headers.device_id = deviceId;

  return headers;
}

function parseUploadResponse<T>(xhr: XMLHttpRequest): T {
  const text = xhr.responseText || "";
  if (!text) return {} as T;

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new UploadRequestError("Invalid JSON response from server.", xhr.status, text);
  }

  if (json.success === false) {
    const reason =
      (typeof json.reason === "string" && json.reason) ||
      (typeof json.message === "string" && json.message) ||
      "Upload failed.";
    throw new UploadRequestError(reason, xhr.status, json);
  }

  return json as T;
}

/**
 * Upload multipart form data with native XHR progress (byte-accurate loaded/total).
 */
export function uploadFormData<T = Record<string, unknown>>(
  options: UploadFormDataOptions
): Promise<T> {
  const { method = "POST", path, formData, file, onProgress } = options;
  const totalBytes = file.size > 0 ? file.size : 0;

  onProgress?.(createUploadProgress(file.name, "uploading", 0, totalBytes));

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, buildUploadUrl(path));

    const headers = buildUploadHeaders(options);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      applyUploadProgressEvent(file, onProgress, event);
    };

    xhr.onload = () => {
      const loadedTotal = totalBytes > 0 ? totalBytes : file.size;

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(createUploadProgress(file.name, "processing", loadedTotal, loadedTotal));
        try {
          const data = parseUploadResponse<T>(xhr);
          onProgress?.(createUploadProgress(file.name, "done", loadedTotal, loadedTotal));
          resolve(data);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed.";
          onProgress?.(
            createUploadProgress(file.name, "error", 0, loadedTotal, message)
          );
          reject(error);
        }
        return;
      }

      let message = `Upload failed (${xhr.status})`;
      try {
        const payload = JSON.parse(xhr.responseText || "{}") as Record<string, unknown>;
        message =
          (typeof payload.reason === "string" && payload.reason) ||
          (typeof payload.message === "string" && payload.message) ||
          message;
        reject(new UploadRequestError(message, xhr.status, payload));
      } catch {
        reject(new UploadRequestError(message, xhr.status, xhr.responseText));
      }
      onProgress?.(createUploadProgress(file.name, "error", 0, loadedTotal, message));
    };

    xhr.onerror = () => {
      const message = "Network error during upload.";
      onProgress?.(createUploadProgress(file.name, "error", 0, totalBytes, message));
      reject(new UploadRequestError(message, 0, null));
    };

    xhr.onabort = () => {
      const message = "Upload cancelled.";
      onProgress?.(createUploadProgress(file.name, "error", 0, totalBytes, message));
      reject(new UploadRequestError(message, 0, null));
    };

    xhr.send(formData);
  });
}
