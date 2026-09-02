import path from 'node:path';
import { parse } from 'smol-toml';
import fs from 'fs-extra';
import {
  SiteManifestSchema,
  validateNoDuplicateSites,
} from '../config/site-schema.js';
import type { ManifestToml } from '../config/site-schema.js';
import type { SiteConfig, SiteManifest } from '../config/types.js';

export interface ParseResult {
  manifest: SiteManifest;
  errors: string[];
}

export function transformTomlToManifest(raw: ManifestToml): SiteManifest {
  const sites: SiteConfig[] = raw.sites.map((s) => ({
    name: s.name,
    title: s.title,
    tagline: s.tagline,
    domain: s.domain,
    contentDir: s.content_dir,
    sidebar: s.sidebar as SiteConfig['sidebar'],
    overrides: s.overrides as SiteConfig['overrides'],
    deployOverrides: s.deploy_overrides
      ? {
          domain: s.deploy_overrides.domain,
          branch: s.deploy_overrides.branch,
          projectName: s.deploy_overrides.project_name,
        }
      : undefined,
  }));

  return {
    shared: raw.shared.config,
    root: raw.shared.root,
    outputDir: raw.shared.output_dir,
    sites,
  };
}

export async function parseManifest(manifestPath: string): Promise<ParseResult> {
  const errors: string[] = [];
  const absolutePath = path.resolve(manifestPath);

  let content: string;
  try {
    content = await fs.readFile(absolutePath, 'utf-8');
  } catch {
    return {
      manifest: { shared: '', root: '', outputDir: '', sites: [] },
      errors: [`Failed to read manifest file: ${absolutePath}`],
    };
  }

  let raw: ManifestToml;
  try {
    raw = parse(content) as unknown as ManifestToml;
  } catch (e) {
    return {
      manifest: { shared: '', root: '', outputDir: '', sites: [] },
      errors: [`Failed to parse TOML: ${(e as Error).message}`],
    };
  }

  if (!raw.shared || !raw.sites) {
    errors.push('Manifest must contain [shared] and [[sites]] sections');
    return {
      manifest: { shared: '', root: '', outputDir: '', sites: [] },
      errors,
    };
  }

  const manifest = transformTomlToManifest(raw);

  const parsed = SiteManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map(
      (iss) => `${iss.path.join('.')}: ${iss.message}`,
    );
    errors.push(...fieldErrors);
    return { manifest, errors };
  }

  try {
    validateNoDuplicateSites(manifest.sites);
  } catch (e) {
    errors.push((e as Error).message);
    return { manifest, errors };
  }

  const rootDir = path.resolve(path.dirname(absolutePath), manifest.root);
  for (const site of manifest.sites) {
    const contentDir = path.resolve(rootDir, site.contentDir);
    try {
      await fs.access(contentDir);
    } catch {
      errors.push(
        `Content directory for site "${site.name}" does not exist: ${contentDir}`,
      );
    }
  }

  return { manifest, errors };
}

export function getAffectedSites(
  manifest: SiteManifest,
  changedFiles: string[],
): string[] {
  const rootDir = path.resolve(manifest.root);
  const affected = new Set<string>();

  for (const file of changedFiles) {
    const absolute = path.resolve(file);
    const relative = path.relative(rootDir, absolute);

    if (relative.startsWith('..')) continue;

    for (const site of manifest.sites) {
      const contentRelative = site.contentDir.replace(/^\.\//, '');
      if (relative.startsWith(contentRelative)) {
        affected.add(site.name);
      }
    }

    const alwaysRebuild = [
      'package.json',
      'pnpm-lock.yaml',
      'astro.config',
      'shared.config',
    ];
    for (const trigger of alwaysRebuild) {
      if (relative.includes(trigger)) {
        for (const site of manifest.sites) {
          affected.add(site.name);
        }
        break;
      }
    }
  }

  return [...affected];
}
