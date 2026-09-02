import { describe, it, expect } from 'vitest';
import { createConfig, createSite } from '../src/config/create-config.js';
import type { SharedConfig, SiteConfig } from '../src/config/types.js';

const baseShared: SharedConfig = {
  defaults: {
    locale: 'en',
    theme: { defaultMode: 'dark' },
    plugins: ['plugin-a'],
    integrations: ['int-a'],
  },
  shared: {
    components: './src/shared/components',
    styles: './src/shared/styles',
  },
  deploy: {
    platform: 'cloudflare',
    domain: '.wyattau.com',
  },
};

const baseSite: SiteConfig = {
  name: 'ib',
  title: "Wyatt's Notes - IB",
  domain: 'ib.wyattau.com',
  contentDir: './docs/ib',
  sidebar: [{ autogenerate: { directory: 'docs' } }],
};

describe('createConfig', () => {
  it('returns a config object with site URL', () => {
    const config = createConfig(baseShared, baseSite);
    expect(config.site).toBe('https://ib.wyattau.com');
  });

  it('handles domain with https:// prefix', () => {
    const config = createConfig(baseShared, {
      ...baseSite,
      domain: 'https://ib.wyattau.com',
    });
    expect(config.site).toBe('https://ib.wyattau.com');
  });

  it('handles domain with leading dot', () => {
    const config = createConfig(baseShared, {
      ...baseSite,
      domain: '.ib.wyattau.com',
    });
    expect(config.site).toBe('https://ib.wyattau.com');
  });

  it('handles bare subdomain', () => {
    const config = createConfig(baseShared, {
      ...baseSite,
      domain: 'ib',
    });
    expect(config.site).toBe('https://ib.localhost');
  });

  it('sets output directory per site', () => {
    const config = createConfig(baseShared, baseSite);
    expect(config.outDir).toContain('ib');
  });

  it('sets output to static', () => {
    const config = createConfig(baseShared, baseSite);
    expect(config.output).toBe('static');
  });

  it('sets up Vite aliases for shared paths', () => {
    const config = createConfig(baseShared, baseSite);
    const vite = config.vite as { resolve: { alias: Record<string, string> } };
    expect(vite.resolve.alias['@shared/components']).toBeDefined();
    expect(vite.resolve.alias['@shared/styles']).toBeDefined();
  });

  it('omits aliases for undefined shared paths', () => {
    const shared: SharedConfig = {
      ...baseShared,
      shared: {},
    };
    const config = createConfig(shared, baseSite);
    const vite = config.vite as { resolve: { alias: Record<string, string> } };
    expect(vite.resolve.alias['@shared/components']).toBeUndefined();
  });

  it('includes all plugins and integrations', () => {
    const config = createConfig(baseShared, baseSite);
    const integrations = config.integrations as unknown[];
    expect(integrations).toContain('plugin-a');
    expect(integrations).toContain('int-a');
  });

  it('respects custom rootDir and outputDir', () => {
    const config = createConfig(baseShared, baseSite, {
      rootDir: '/custom/root',
      outputDir: 'build',
    });
    expect(config.outDir).toBe('/custom/root/build/ib');
  });
});

describe('createSite', () => {
  it('returns config, siteName, and outputDir', () => {
    const result = createSite(baseShared, baseSite);
    expect(result.siteName).toBe('ib');
    expect(result.config).toBeDefined();
    expect(result.outputDir).toContain('ib');
  });

  it('passes options through to createConfig', () => {
    const result = createSite(baseShared, baseSite, {
      rootDir: '/test',
      outputDir: 'out',
    });
    expect(result.config.outDir).toBe('/test/out/ib');
  });
});
