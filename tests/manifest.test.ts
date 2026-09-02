import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { parseManifest, getAffectedSites, transformTomlToManifest } from '../src/build/manifest.js';
import type { ManifestToml } from '../src/config/site-schema.js';

const FIXTURES_DIR = path.resolve(import.meta.dirname, 'fixtures');
const VALID_MANIFEST = path.join(FIXTURES_DIR, 'sites.toml');

describe('transformTomlToManifest', () => {
  it('transforms snake_case TOML to camelCase manifest', () => {
    const raw: ManifestToml = {
      shared: { config: './shared.ts', root: '.', output_dir: './dist' },
      sites: [
        {
          name: 'test',
          title: 'Test Site',
          domain: 'test.example.com',
          content_dir: './docs/test',
          sidebar: [{ autogenerate: { directory: 'docs' } }],
        },
      ],
    };

    const manifest = transformTomlToManifest(raw);

    expect(manifest.shared).toBe('./shared.ts');
    expect(manifest.root).toBe('.');
    expect(manifest.outputDir).toBe('./dist');
    expect(manifest.sites).toHaveLength(1);
    expect(manifest.sites[0].contentDir).toBe('./docs/test');
    expect(manifest.sites[0].sidebar).toEqual([
      { autogenerate: { directory: 'docs' } },
    ]);
  });

  it('maps deploy_overrides correctly', () => {
    const raw: ManifestToml = {
      shared: { config: './shared.ts', root: '.', output_dir: './dist' },
      sites: [
        {
          name: 'test',
          title: 'Test',
          domain: 'test.com',
          content_dir: './docs',
          sidebar: [],
          deploy_overrides: {
            domain: 'custom.test.com',
            branch: 'staging',
            project_name: 'my-project',
          },
        },
      ],
    };

    const manifest = transformTomlToManifest(raw);
    expect(manifest.sites[0].deployOverrides).toEqual({
      domain: 'custom.test.com',
      branch: 'staging',
      projectName: 'my-project',
    });
  });
});

describe('parseManifest', () => {
  it('parses a valid manifest', async () => {
    const { manifest, errors } = await parseManifest(VALID_MANIFEST);

    expect(errors).toHaveLength(0);
    expect(manifest.sites).toHaveLength(3);
    expect(manifest.sites[0].name).toBe('ib');
    expect(manifest.sites[1].name).toBe('alevel-maths-physics');
    expect(manifest.sites[2].name).toBe('programming');
  });

  it('reports error for missing file', async () => {
    const { errors } = await parseManifest('/nonexistent/sites.toml');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Failed to read');
  });

  it('reports error for invalid TOML', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'bad.toml');
    await fs.writeFile(tmpFile, 'this is not [[valid toml', 'utf-8');
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Failed to parse TOML');
    } finally {
      await fs.remove(tmpFile);
    }
  });

  it('reports error for missing shared section', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'no-shared.toml');
    await fs.writeFile(
      tmpFile,
      `[[sites]]\nname = "test"\ntitle = "Test"\ndomain = "test.com"\ncontent_dir = "./docs"\nsidebar = []\n`,
      'utf-8',
    );
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors.length).toBeGreaterThan(0);
    } finally {
      await fs.remove(tmpFile);
    }
  });

  it('reports error for invalid site name', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'bad-name.toml');
    await fs.writeFile(
      tmpFile,
      [
        '[shared]',
        'config = "./shared.ts"',
        'root = "."',
        'output_dir = "./dist"',
        '',
        '[[sites]]',
        'name = "INVALID NAME!"',
        'title = "Test"',
        'domain = "test.com"',
        'content_dir = "./docs"',
        'sidebar = []',
      ].join('\n'),
      'utf-8',
    );
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('name'))).toBe(true);
    } finally {
      await fs.remove(tmpFile);
    }
  });

  it('reports error for duplicate site names', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'dupes.toml');
    await fs.writeFile(
      tmpFile,
      [
        '[shared]',
        'config = "./shared.ts"',
        'root = "."',
        'output_dir = "./dist"',
        '',
        '[[sites]]',
        'name = "test"',
        'title = "Test 1"',
        'domain = "test1.com"',
        'content_dir = "./docs/a"',
        'sidebar = []',
        '',
        '[[sites]]',
        'name = "test"',
        'title = "Test 2"',
        'domain = "test2.com"',
        'content_dir = "./docs/b"',
        'sidebar = []',
      ].join('\n'),
      'utf-8',
    );
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors).toContain('Duplicate site name: "test"');
    } finally {
      await fs.remove(tmpFile);
    }
  });

  it('reports error for duplicate site domains', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'dup-domains.toml');
    await fs.writeFile(
      tmpFile,
      [
        '[shared]',
        'config = "./shared.ts"',
        'root = "."',
        'output_dir = "./dist"',
        '',
        '[[sites]]',
        'name = "site-a"',
        'title = "Site A"',
        'domain = "same.com"',
        'content_dir = "./docs/a"',
        'sidebar = []',
        '',
        '[[sites]]',
        'name = "site-b"',
        'title = "Site B"',
        'domain = "same.com"',
        'content_dir = "./docs/b"',
        'sidebar = []',
      ].join('\n'),
      'utf-8',
    );
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors).toContain('Duplicate site domain: "same.com"');
    } finally {
      await fs.remove(tmpFile);
    }
  });

  it('reports error for missing content directory', async () => {
    const tmpFile = path.join(FIXTURES_DIR, 'missing-dir.toml');
    await fs.writeFile(
      tmpFile,
      [
        '[shared]',
        'config = "./shared.ts"',
        'root = "."',
        'output_dir = "./dist"',
        '',
        '[[sites]]',
        'name = "test"',
        'title = "Test"',
        'domain = "test.com"',
        'content_dir = "./nonexistent-dir"',
        'sidebar = []',
      ].join('\n'),
      'utf-8',
    );
    try {
      const { errors } = await parseManifest(tmpFile);
      expect(errors.some((e) => e.includes('does not exist'))).toBe(true);
    } finally {
      await fs.remove(tmpFile);
    }
  });
});

describe('getAffectedSites', () => {
  it('returns matching sites for changed files', () => {
    const manifest = {
      shared: './shared.ts',
      root: '.',
      outputDir: './dist',
      sites: [
        { name: 'ib', title: 'IB', domain: 'ib.com', contentDir: './docs/ib', sidebar: [] },
        { name: 'alevel', title: 'A-Level', domain: 'alevel.com', contentDir: './docs/alevel', sidebar: [] },
      ],
    };

    const affected = getAffectedSites(manifest, ['docs/ib/math.md']);
    expect(affected).toEqual(['ib']);
  });

  it('returns multiple sites when files affect multiple', () => {
    const manifest = {
      shared: './shared.ts',
      root: '.',
      outputDir: './dist',
      sites: [
        { name: 'ib', title: 'IB', domain: 'ib.com', contentDir: './docs/ib', sidebar: [] },
        { name: 'alevel', title: 'A-Level', domain: 'alevel.com', contentDir: './docs/alevel', sidebar: [] },
      ],
    };

    const affected = getAffectedSites(manifest, [
      'docs/ib/math.md',
      'docs/alevel/physics.md',
    ]);
    expect(affected.sort()).toEqual(['alevel', 'ib']);
  });

  it('returns all sites for shared config changes', () => {
    const manifest = {
      shared: './shared.ts',
      root: '.',
      outputDir: './dist',
      sites: [
        { name: 'ib', title: 'IB', domain: 'ib.com', contentDir: './docs/ib', sidebar: [] },
        { name: 'alevel', title: 'A-Level', domain: 'alevel.com', contentDir: './docs/alevel', sidebar: [] },
      ],
    };

    const affected = getAffectedSites(manifest, ['package.json']);
    expect(affected.sort()).toEqual(['alevel', 'ib']);
  });

  it('returns empty array for unrelated files', () => {
    const manifest = {
      shared: './shared.ts',
      root: '.',
      outputDir: './dist',
      sites: [
        { name: 'ib', title: 'IB', domain: 'ib.com', contentDir: './docs/ib', sidebar: [] },
      ],
    };

    const affected = getAffectedSites(manifest, ['README.md']);
    expect(affected).toEqual([]);
  });
});
