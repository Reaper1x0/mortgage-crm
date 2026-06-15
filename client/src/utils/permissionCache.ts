import type { EffectivePermissions, PermissionCatalogEntry } from "../service/organizationService";

export type PermissionSnapshot = {
  effective: EffectivePermissions | null;
  organizationPermissions: Set<string>;
  workspacePermissions: Set<string>;
  catalog: PermissionCatalogEntry[];
};

const snapshotByScope = new Map<string, PermissionSnapshot>();
const catalogByOrg = new Map<string, PermissionCatalogEntry[]>();

export function getPermissionSnapshot(cacheKey: string): PermissionSnapshot | undefined {
  return snapshotByScope.get(cacheKey);
}

export function setPermissionSnapshot(cacheKey: string, snapshot: PermissionSnapshot): void {
  snapshotByScope.set(cacheKey, snapshot);
}

export function getPermissionCatalog(orgId: string): PermissionCatalogEntry[] | undefined {
  return catalogByOrg.get(orgId);
}

export function setPermissionCatalog(orgId: string, catalog: PermissionCatalogEntry[]): void {
  catalogByOrg.set(orgId, catalog);
}

export function invalidatePermissionScope(cacheKey: string): void {
  snapshotByScope.delete(cacheKey);
}

export function clearPermissionCache(): void {
  snapshotByScope.clear();
  catalogByOrg.clear();
}
