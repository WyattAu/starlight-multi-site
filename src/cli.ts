#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { parseManifest } from './build/manifest.js';
import { BuildOrchestrator } from './build/orchestrator.js';
import { generateAllWorkflows, writeWorkflows } from './deploy/github-actions.js';
import { deployToCloudflare } from './deploy/cloudflare.js';
import type { SiteManifest } from './config/types.js';

const VERSION = '0.1.0';
const DEFAULT_MANIFEST = 'sites.toml';

async function loadManifest(manifestPath: string): Promise<SiteManifest> {
  const { manifest, errors } = await parseManifest(manifestPath);
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(pc.red(`  ✘ ${error}`));
    }
    process.exit(1);
  }
  return manifest;
}

const program = new Command();

program
  .name('starlight-multi-site')
  .description('CLI for managing multiple Starlight documentation sites from a monorepo')
  .version(VERSION);

program
  .command('build')
  .description('Build one, all, or changed sites')
  .option('--site <name>', 'Build a specific site by name')
  .option('--all', 'Build all sites')
  .option('--changed <files>', 'Comma-separated list of changed files')
  .option('--parallel <n>', 'Max parallel builds', '2')
  .option('--dry-run', 'Show what would be built without building')
  .option('--manifest <path>', 'Path to sites.toml', DEFAULT_MANIFEST)
  .option('--shared-cache <path>', 'Path to shared Vite cache directory')
  .option('--verbose', 'Show build output')
  .action(async (opts) => {
    const manifest = await loadManifest(opts.manifest);
    const orchestrator = new BuildOrchestrator(manifest, {
      concurrency: parseInt(opts.parallel, 10),
      dryRun: opts.dryRun,
      sharedCache: opts.sharedCache,
      verbose: opts.verbose,
    });

    let results;

    if (opts.site) {
      results = [await orchestrator.buildSite(opts.site)];
    } else if (opts.all) {
      results = await orchestrator.buildAll();
    } else if (opts.changed) {
      const files = opts.changed.split(',').map((f: string) => f.trim());
      results = await orchestrator.buildChanged(files);
    } else {
      console.error(
        pc.red('Specify --site <name>, --all, or --changed <files>'),
      );
      process.exit(1);
      return;
    }

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log();
    console.log(
      pc.bold(`Results: ${pc.green(`${succeeded.length} succeeded`)}, ${pc.red(`${failed.length} failed`)}`),
    );

    for (const r of succeeded) {
      const time = `${(r.duration / 1000).toFixed(2)}s`;
      console.log(
        `  ${pc.green('✔')} ${r.site} (${time}${r.outputSize ? `, ${formatBytes(r.outputSize)}` : ''})`,
      );
    }

    for (const r of failed) {
      console.log(`  ${pc.red('✘')} ${r.site}: ${r.error}`);
    }

    if (failed.length > 0) {
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Deploy sites to Cloudflare Pages')
  .option('--site <name>', 'Deploy a specific site')
  .option('--all', 'Deploy all sites')
  .option('--dry-run', 'Show what would be deployed')
  .option('--manifest <path>', 'Path to sites.toml', DEFAULT_MANIFEST)
  .action(async (opts) => {
    const manifest = await loadManifest(opts.manifest);

    const sites = opts.site
      ? manifest.sites.filter((s) => s.name === opts.site)
      : opts.all
        ? manifest.sites
        : null;

    if (!sites) {
      console.error(pc.red('Specify --site <name> or --all'));
      process.exit(1);
      return;
    }

    if (sites.length === 0) {
      console.error(pc.red(`Site "${opts.site}" not found in manifest`));
      process.exit(1);
      return;
    }

    for (const site of sites) {
      const outputDir = `${manifest.outputDir}/${site.name}`;
      console.log(pc.cyan(`Deploying ${pc.bold(site.name)}...`));

      const result = await deployToCloudflare({
        site,
        outputDir,
        dryRun: opts.dryRun,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
      });

      if (result.success) {
        console.log(pc.green(`✔ ${site.name} → ${result.url}`));
      } else {
        console.error(pc.red(`✘ ${site.name}: ${result.error}`));
      }
    }
  });

program
  .command('generate-ci')
  .description('Generate GitHub Actions deploy workflows')
  .option('--output <dir>', 'Output directory for workflow files', '.github/workflows')
  .option('--manifest <path>', 'Path to sites.toml', DEFAULT_MANIFEST)
  .action(async (opts) => {
    const manifest = await loadManifest(opts.manifest);

    const workflows = generateAllWorkflows(manifest.sites, {
      sharedPaths: [
        'src/pages/**',
        'src/theme/**',
        'src/components/**',
        'src/css/**',
        'static/**',
        'package.json',
        'pnpm-lock.yaml',
      ],
      secrets: [
        'SENTRY_DSN',
        'CLOUDFLARE_API_TOKEN',
        'CLOUDFLARE_ACCOUNT_ID',
      ],
    });

    const written = await writeWorkflows(workflows, opts.output);

    console.log(pc.green(`Generated ${written.length} workflow files:`));
    for (const f of written) {
      console.log(`  ${pc.dim('→')} ${f}`);
    }
  });

program
  .command('validate')
  .description('Validate the site manifest')
  .option('--manifest <path>', 'Path to sites.toml', DEFAULT_MANIFEST)
  .action(async (opts) => {
    const { errors } = await parseManifest(opts.manifest);

    if (errors.length === 0) {
      console.log(pc.green('Manifest is valid'));
      return;
    }

    console.error(pc.red(`Validation failed with ${errors.length} error(s):`));
    for (const error of errors) {
      console.error(`  ${pc.red('✘')} ${error}`);
    }
    process.exit(1);
  });

program
  .command('list')
  .description('List all sites in the manifest')
  .option('--manifest <path>', 'Path to sites.toml', DEFAULT_MANIFEST)
  .action(async (opts) => {
    const manifest = await loadManifest(opts.manifest);

    console.log(pc.bold(`Sites (${manifest.sites.length}):`));
    for (const site of manifest.sites) {
      const domain = pc.dim(site.domain);
      const content = pc.dim(site.contentDir);
      console.log(`  ${pc.cyan('●')} ${pc.bold(site.name)} — ${site.title}`);
      console.log(`    ${domain} | ${content}`);
    }
  });

program.parse();

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
