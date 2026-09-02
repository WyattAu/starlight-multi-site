import path from 'node:path';
import { execa } from 'execa';
import pc from 'picocolors';
import type { SiteManifest, BuildOptions, BuildResult } from '../config/types.js';
import { getAffectedSites } from './manifest.js';
import { createCacheManager, linkCacheToSite, cleanupStaleCaches } from './cache.js';

export class BuildOrchestrator {
  private manifest: SiteManifest;
  private options: BuildOptions;
  private cache;

  constructor(manifest: SiteManifest, options: BuildOptions = {}) {
    this.manifest = manifest;
    this.options = {
      concurrency: 2,
      dryRun: false,
      verbose: false,
      ...options,
    };
    this.cache = createCacheManager(
      path.resolve(manifest.root),
      this.options.sharedCache,
    );
  }

  async buildSite(name: string): Promise<BuildResult> {
    const site = this.manifest.sites.find((s) => s.name === name);
    if (!site) {
      return {
        site: name,
        success: false,
        duration: 0,
        error: `Site "${name}" not found in manifest`,
      };
    }

    return this.executeBuild(site);
  }

  async buildAll(): Promise<BuildResult[]> {
    await cleanupStaleCaches(
      this.cache,
      this.manifest.sites.map((s) => s.name),
    );

    return this.buildSites(this.manifest.sites);
  }

  async buildChanged(changedFiles: string[]): Promise<BuildResult[]> {
    const affectedNames = getAffectedSites(this.manifest, changedFiles);

    if (affectedNames.length === 0) {
      return [];
    }

    const affectedSites = this.manifest.sites.filter(
      (s) => affectedNames.includes(s.name),
    );

    return this.buildSites(affectedSites);
  }

  private async buildSites(
    sites: SiteManifest['sites'],
  ): Promise<BuildResult[]> {
    const concurrency = this.options.concurrency ?? 2;
    const results: BuildResult[] = [];

    if (this.options.dryRun) {
      for (const site of sites) {
        this.logDryRun(site.name);
        results.push({
          site: site.name,
          success: true,
          duration: 0,
        });
      }
      return results;
    }

    const queue = [...sites];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const site = queue.shift();
            if (!site) break;
            const result = await this.executeBuild(site);
            results.push(result);
          }
        })(),
      );
    }

    await Promise.all(workers);

    return results;
  }

  private async executeBuild(site: SiteManifest['sites'][number]): Promise<BuildResult> {
    const start = performance.now();
    const outputDir = path.resolve(
      this.manifest.root,
      this.manifest.outputDir,
      site.name,
    );

    this.logBuildStart(site.name);

    try {
      const siteNodeModules = path.resolve(this.manifest.root, 'node_modules');
      await linkCacheToSite(this.cache, site.name, siteNodeModules);

      const astroBin = path.resolve(
        this.manifest.root,
        'node_modules/.bin/astro',
      );

      const env: Record<string, string> = {
        ...process.env,
        SITE_NAME: site.name,
        SITE_DOMAIN: site.domain,
        SITE_TITLE: site.title,
        SITE_CONTENT_DIR: site.contentDir,
        SITE_OUTPUT_DIR: outputDir,
      };

      if (site.deployOverrides?.projectName) {
        env.SITE_PROJECT_NAME = site.deployOverrides.projectName;
      }

      await execa(astroBin, ['build'], {
        cwd: path.resolve(this.manifest.root),
        env,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        reject: true,
      });

      const duration = performance.now() - start;

      let outputSize: number | undefined;
      try {
        const stats = await getDirectorySize(outputDir);
        outputSize = stats;
      } catch {
        // Output dir may not exist if build was unusual
      }

      this.logBuildSuccess(site.name, duration);

      return {
        site: site.name,
        success: true,
        duration,
        outputSize,
        outputPath: outputDir,
      };
    } catch (e) {
      const duration = performance.now() - start;
      const message = e instanceof Error ? e.message : String(e);

      this.logBuildFailure(site.name, message);

      return {
        site: site.name,
        success: false,
        duration,
        error: message,
      };
    }
  }

  private logBuildStart(name: string): void {
    if (!this.options.dryRun) {
      console.log(pc.cyan(`▶ Building site: ${pc.bold(name)}`));
    }
  }

  private logBuildSuccess(name: string, duration: number): void {
    const time = pc.green(`${(duration / 1000).toFixed(2)}s`);
    console.log(pc.green(`✔ Built ${pc.bold(name)} in ${time}`));
  }

  private logBuildFailure(name: string, error: string): void {
    console.error(pc.red(`✘ Failed to build ${pc.bold(name)}: ${error}`));
  }

  private logDryRun(name: string): void {
    console.log(pc.yellow(`⏭ [dry-run] Would build: ${pc.bold(name)}`));
  }
}

async function getDirectorySize(dir: string): Promise<number> {
  const { default: fg } = await import('fast-glob');
  const files = await fg('**/*', { cwd: dir, onlyFiles: true });
  const fs = await import('fs-extra');
  let totalSize = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath).catch(() => null);
    if (stat) {
      totalSize += stat.size;
    }
  }
  return totalSize;
}
