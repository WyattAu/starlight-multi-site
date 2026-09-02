import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuildOrchestrator } from '../src/build/orchestrator.js';
import type { SiteManifest, BuildOptions } from '../src/config/types.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

vi.mock('fast-glob', () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock('../src/build/cache.js', () => ({
  createCacheManager: () => ({
    cacheDir: '/tmp/test-cache',
    ensure: vi.fn().mockResolvedValue(undefined),
    getSiteCacheDir: (name: string) => `/tmp/test-cache/${name}`,
    invalidate: vi.fn().mockResolvedValue(undefined),
  }),
  linkCacheToSite: vi.fn().mockResolvedValue(undefined),
  cleanupStaleCaches: vi.fn().mockResolvedValue(undefined),
}));

const mockManifest: SiteManifest = {
  shared: './shared.config.ts',
  root: '.',
  outputDir: './dist',
  sites: [
    {
      name: 'site-a',
      title: 'Site A',
      domain: 'site-a.example.com',
      contentDir: './docs/a',
      sidebar: [{ autogenerate: { directory: 'docs' } }],
    },
    {
      name: 'site-b',
      title: 'Site B',
      domain: 'site-b.example.com',
      contentDir: './docs/b',
      sidebar: [{ autogenerate: { directory: 'docs' } }],
    },
    {
      name: 'site-c',
      title: 'Site C',
      domain: 'site-c.example.com',
      contentDir: './docs/c',
      sidebar: [{ autogenerate: { directory: 'docs' } }],
    },
  ],
};

describe('BuildOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildSite', () => {
    it('returns error for unknown site', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const result = await orch.buildSite('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns success for known site', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const result = await orch.buildSite('site-a');
      expect(result.site).toBe('site-a');
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('buildAll', () => {
    it('builds all sites', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const results = await orch.buildAll();
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('builds sites in parallel with configured concurrency', async () => {
      const options: BuildOptions = { concurrency: 2 };
      const orch = new BuildOrchestrator(mockManifest, options);
      const results = await orch.buildAll();
      expect(results).toHaveLength(3);
    });
  });

  describe('buildChanged', () => {
    it('returns empty for unrelated changes', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const results = await orch.buildChanged(['README.md']);
      expect(results).toHaveLength(0);
    });

    it('builds affected sites', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const results = await orch.buildChanged(['docs/a/index.md']);
      expect(results).toHaveLength(1);
      expect(results[0].site).toBe('site-a');
    });

    it('builds all sites for package.json change', async () => {
      const orch = new BuildOrchestrator(mockManifest);
      const results = await orch.buildChanged(['package.json']);
      expect(results).toHaveLength(3);
    });
  });

  describe('dry-run', () => {
    it('reports builds without executing', async () => {
      const orch = new BuildOrchestrator(mockManifest, { dryRun: true });
      const results = await orch.buildAll();
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.every((r) => r.duration === 0)).toBe(true);
    });
  });
});
