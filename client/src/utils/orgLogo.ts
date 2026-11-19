import type { OrganizationMembership, WorkspaceSummary } from "../service/workspaceService";

const LOGO_CACHE_KEY = "orgLogoUrlCache";
/** Signed URLs live 12h on the server; drop cache a bit earlier. */
const LOGO_CACHE_MAX_AGE_MS = 10 * 60 * 60 * 1000;

type LogoCacheEntry = { url: string; savedAt: number };
type LogoCache = Record<string, LogoCacheEntry>;

function readCache(): LogoCache {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LogoCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: LogoCache): void {
  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota / private mode
  }
}

/** One logo for the organization, wherever it is shown. */
export function resolveOrganizationLogoUrl(
  organization?: Pick<OrganizationMembership, "branding"> | null,
  workspace?: Pick<WorkspaceSummary, "branding"> | null,
): string | null {
  return (
    organization?.branding?.logoUrl ||
    workspace?.branding?.organization?.logoUrl ||
    workspace?.branding?.effective?.logoUrl ||
    null
  );
}

export function readCachedOrganizationLogoUrl(organizationId?: string | null): string | null {
  if (!organizationId) return null;
  const entry = readCache()[organizationId];
  if (!entry?.url) return null;
  if (Date.now() - entry.savedAt > LOGO_CACHE_MAX_AGE_MS) return null;
  return entry.url;
}

export function writeCachedOrganizationLogoUrl(
  organizationId: string,
  logoUrl: string | null | undefined,
): void {
  const cache = readCache();
  if (!logoUrl) {
    delete cache[organizationId];
  } else {
    cache[organizationId] = { url: logoUrl, savedAt: Date.now() };
  }
  writeCache(cache);
}

/** Persist + warm browser cache so nav logos paint without waiting on the next /workspaces call. */
export function cacheOrganizationLogosFromMemberships(organizations: OrganizationMembership[]): void {
  for (const org of organizations) {
    const url = org.branding?.logoUrl || null;
    writeCachedOrganizationLogoUrl(org.organizationId, url);
    if (url && typeof window !== "undefined") {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }
}
