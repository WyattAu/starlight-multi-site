import path from 'node:path';
import fs from 'fs-extra';

export interface SharedContentOptions {
  rootDir: string;
  sharedDir: string;
  siteContentDir: string;
}

export async function linkSharedContent(options: SharedContentOptions): Promise<void> {
  const { rootDir, sharedDir, siteContentDir } = options;

  const absoluteShared = path.resolve(rootDir, sharedDir);
  const absoluteSiteContent = path.resolve(rootDir, siteContentDir);

  const sharedExists = await fs.pathExists(absoluteShared);
  if (!sharedExists) return;

  const entries = await fs.readdir(absoluteShared, { withFileTypes: true });

  for (const entry of entries) {
    const targetPath = path.join(absoluteSiteContent, entry.name);
    const sourcePath = path.join(absoluteShared, entry.name);

    const targetExists = await fs.pathExists(targetPath);
    if (targetExists) continue;

    if (entry.isDirectory()) {
      await fs.ensureSymlink(sourcePath, targetPath, 'junction');
    } else if (entry.isFile()) {
      await fs.ensureSymlink(sourcePath, targetPath, 'file');
    }
  }
}

export async function unlinkSharedContent(
  siteContentDir: string,
  sharedDir: string,
): Promise<void> {
  const absoluteShared = path.resolve(sharedDir);
  const absoluteSiteContent = path.resolve(siteContentDir);

  if (!(await fs.pathExists(absoluteSiteContent))) return;

  const entries = await fs.readdir(absoluteSiteContent, { withFileTypes: true });
  const sharedNames = await fs.readdir(absoluteShared).catch(() => [] as string[]);
  const sharedSet = new Set(sharedNames);

  for (const entry of entries) {
    if (!sharedSet.has(entry.name)) continue;

    const targetPath = path.join(absoluteSiteContent, entry.name);
    const stat = await fs.lstat(targetPath).catch(() => null);
    if (stat?.isSymbolicLink()) {
      await fs.unlink(targetPath);
    }
  }
}
