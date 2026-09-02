import path from 'node:path';
import type {
  AstroUserConfig,
  SharedConfig,
  SiteConfig,
} from './types.js';
import { deepMerge, mergeSidebar } from './merge.js';

export interface CreateConfigOptions {
  rootDir?: string;
  outputDir?: string;
}

export function createConfig(
  shared: SharedConfig,
  site: SiteConfig,
  options: CreateConfigOptions = {},
): AstroUserConfig {
  const rootDir = options.rootDir ?? process.cwd();
  const outputDir = options.outputDir ?? 'dist';

  const mergedDefaults = deepMerge(
    { ...shared.defaults },
    site.overrides ?? {},
  );
  const sidebar = mergeSidebar(mergedDefaults.sidebar, site.sidebar);

  const siteUrl = buildSiteUrl(site.domain);
  const siteOutputDir = path.resolve(rootDir, outputDir, site.name);

  const integrations = buildIntegrations(shared, mergedDefaults);

  const config: AstroUserConfig = {
    site: siteUrl,
    outDir: siteOutputDir,
    srcDir: path.resolve(rootDir, 'src'),
    integrations,
    output: 'static',
    build: {
      assets: '_assets',
    },
    vite: {
      resolve: {
        alias: buildAliases(shared, rootDir),
      },
    },
  };

  void sidebar;

  return config;
}

function buildSiteUrl(domain: string): string {
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  if (domain.startsWith('.')) {
    return `https://${domain.slice(1)}`;
  }
  if (domain.includes('.')) {
    return `https://${domain}`;
  }
  return `https://${domain}.localhost`;
}

function buildIntegrations(
  _shared: SharedConfig,
  mergedDefaults: Record<string, unknown>,
): AstroUserConfig['integrations'] {
  const integrations: AstroUserConfig['integrations'] = [];

  const plugins = mergedDefaults.plugins as unknown[] | undefined;
  if (plugins) {
    for (const plugin of plugins) {
      integrations.push(plugin);
    }
  }

  const ints = mergedDefaults.integrations as unknown[] | undefined;
  if (ints) {
    for (const integration of ints) {
      integrations.push(integration);
    }
  }

  return integrations;
}

function buildAliases(
  shared: SharedConfig,
  rootDir: string,
): Record<string, string> {
  const aliases: Record<string, string> = {};

  if (shared.shared.components) {
    aliases['@shared/components'] = path.resolve(rootDir, shared.shared.components);
  }
  if (shared.shared.styles) {
    aliases['@shared/styles'] = path.resolve(rootDir, shared.shared.styles);
  }
  if (shared.shared.content) {
    aliases['@shared/content'] = path.resolve(rootDir, shared.shared.content);
  }
  if (shared.shared.assets) {
    aliases['@shared/assets'] = path.resolve(rootDir, shared.shared.assets);
  }

  return aliases;
}

export function createSite(
  shared: SharedConfig,
  site: SiteConfig,
  options?: CreateConfigOptions,
): { config: AstroUserConfig; siteName: string; outputDir: string } {
  const config = createConfig(shared, site, options);
  return {
    config,
    siteName: site.name,
    outputDir: config.outDir ?? `dist/${site.name}`,
  };
}
