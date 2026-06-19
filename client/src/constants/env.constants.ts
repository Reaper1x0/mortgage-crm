const rawServerUrl = String(import.meta.env.VITE_SERVER_URL || "").trim();

/** API base URL with trailing slash (e.g. http://host/backend/api/) */
export const SERVER_URL = rawServerUrl ? `${rawServerUrl.replace(/\/+$/, "")}/` : "";
