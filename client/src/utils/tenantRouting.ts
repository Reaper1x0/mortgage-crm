const RESERVED_TOP_LEVEL = new Set([
  "",
  "register",
  "email-verification",
  "forgot-password",
  "pricing",
  "super-admin",
  "unauthorized",
  "workspace",
]);

export const getTenantFromPath = (pathname?: string): { organizationId: string | null; workspaceId: string | null } => {
  const path = String(pathname || (typeof window !== "undefined" ? window.location.pathname : "") || "");
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return { organizationId: null, workspaceId: null };
  const first = segments[0];
  if (RESERVED_TOP_LEVEL.has(first)) return { organizationId: null, workspaceId: null };
  const organizationId = first;
  let workspaceId: string | null = null;
  const wsIdx = segments.findIndex((s) => s === "workspaces");
  if (wsIdx >= 0 && segments[wsIdx + 1]) {
    workspaceId = segments[wsIdx + 1];
  }
  return { organizationId, workspaceId };
};

export const buildOrganizationPath = (organizationId: string, suffix = "") => {
  const normalizedSuffix = String(suffix || "").replace(/^\/+/, "");
  return normalizedSuffix ? `/${organizationId}/${normalizedSuffix}` : `/${organizationId}`;
};

export const buildWorkspacePath = (organizationId: string, workspaceId: string, suffix = "") => {
  const normalizedSuffix = String(suffix || "").replace(/^\/+/, "");
  const base = `/${organizationId}/workspaces/${workspaceId}`;
  return normalizedSuffix ? `${base}/${normalizedSuffix}` : base;
};
