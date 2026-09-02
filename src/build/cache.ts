import path from 'node:path';
import fs from 'fs-extra';

export interface CacheManager {
  readonly cacheDir: string;
  ensure(): Promise<void>;
  getSiteCacheDir(siteName: string): string;
  invalidate(): Promise<void>;
}

export function createCacheManager(
  rootDir: string,
  cacheSubdir?: string,
): CacheManager {
  const cacheDir = path.resolve(rootDir, cacheSubdir ?? 'node_modules/.vite');

  return {
    get cacheDir() {
      return cacheDir;
    },

    async ensure(): Promise<void> {
      await fs.ensureDir(cacheDir);
    },

    getSiteCacheDir(siteName: string): string {
      return path.join(cacheDir, siteName);
    },

    async invalidate(): Promise<void> {
      try {
        await fs.remove(cacheDir);
      } catch {
        // Cache may not exist; that's fine
      }
    },
  };
}

export async function linkCacheToSite(
  cacheManager: CacheManager,
  siteName: string,
  siteNodeModules: string,
): Promise<void> {
  await cacheManager.ensure();

  const siteCacheDir = path.join(siteNodeModules, '.vite');
  const sharedCacheDir = cacheManager.getSiteCacheDir(siteName);

  await fs.ensureDir(sharedCacheDir);

  try {
    const existing = await fs.lstat(siteCacheDir).catch(() => null);
    if (existing?.isSymbolicLink()) {
      await fs.unlink(siteCacheDir);
    } else if (existing?.isDirectory()) {
      await fs.remove(siteCacheDir);
    }
  } catch {
    // Proceed with symlink creation
  }

  await fs.ensureDir(path.dirname(siteCacheDir));
  await fs.symlink(sharedCacheDir, siteCacheDir, 'junction');
}

export async function cleanupStaleCaches(
  cacheManager: CacheManager,
  activeSiteNames: string[],
): Promise<void> {
  await cacheManager.ensure();

  let entries: string[];
  try {
    entries = await fs.readdir(cacheManager.cacheDir);
  } catch {
    return;
  }

  const active = new Set(activeSiteNames);
  for (const entry of entries) {
    if (!active.has(entry)) {
      const entryPath = path.join(cacheManager.cacheDir, entry);
      const stat = await fs.lstat(entryPath).catch(() => null);
      if (stat?.isDirectory()) {
        await fs.remove(entryPath);
      }
    }
  }
}
