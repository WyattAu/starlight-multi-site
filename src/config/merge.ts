import type { SidebarConfig } from './types.js';

const REPLACE_KEYS = new Set(['sidebar', 'items', 'navbar']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deepMerge(shared: any, site: any): any {
  if (shared === undefined || shared === null) return site;
  if (site === undefined || site === null) return shared;

  if (Array.isArray(shared) && Array.isArray(site)) {
    return site;
  }

  if (typeof shared === 'object' && typeof site === 'object' && shared !== null && site !== null) {
    if (Array.isArray(shared) || Array.isArray(site)) {
      return site;
    }

    const merged = { ...shared } as Record<string, unknown>;
    for (const key of Object.keys(site as Record<string, unknown>)) {
      const sharedVal = (shared as Record<string, unknown>)[key];
      const siteVal = (site as Record<string, unknown>)[key];

      if (siteVal === undefined) continue;

      if (sharedVal === undefined) {
        merged[key] = siteVal;
        continue;
      }

      if (REPLACE_KEYS.has(key)) {
        merged[key] = siteVal;
        continue;
      }

      if (
        Array.isArray(sharedVal) &&
        Array.isArray(siteVal) &&
        !REPLACE_KEYS.has(key)
      ) {
        merged[key] = concatDedupe(sharedVal, siteVal);
        continue;
      }

      if (
        typeof sharedVal === 'object' &&
        typeof siteVal === 'object' &&
        sharedVal !== null &&
        siteVal !== null &&
        !Array.isArray(sharedVal) &&
        !Array.isArray(siteVal)
      ) {
        merged[key] = deepMerge(sharedVal, siteVal);
        continue;
      }

      merged[key] = siteVal;
    }
    return merged;
  }

  return site;
}

function concatDedupe(a: unknown[], b: unknown[]): unknown[] {
  return [...a, ...b];
}

export function mergeSidebar(
  shared: SidebarConfig | undefined,
  site: SidebarConfig,
): SidebarConfig {
  if (!shared) return site;
  return site;
}
