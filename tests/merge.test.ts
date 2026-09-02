import { describe, it, expect } from 'vitest';
import { deepMerge, mergeSidebar } from '../src/config/merge.js';
import type { SidebarConfig } from '../src/config/types.js';

describe('deepMerge', () => {
  it('returns site value when shared is undefined', () => {
    expect(deepMerge(undefined, { a: 1 })).toEqual({ a: 1 });
  });

  it('returns shared value when site is null', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
  });

  it('overrides primitives with site value', () => {
    expect(deepMerge({ locale: 'en' }, { locale: 'zh' })).toEqual({ locale: 'zh' });
  });

  it('deep merges nested objects', () => {
    const shared = {
      theme: { defaultMode: 'dark', disableSwitch: false },
    };
    const site = {
      theme: { defaultMode: 'light' },
    };
    expect(deepMerge(shared, site)).toEqual({
      theme: { defaultMode: 'light', disableSwitch: false },
    });
  });

  it('replaces sidebar arrays instead of concatenating', () => {
    const shared = {
      sidebar: [{ label: 'Shared' }],
    };
    const site = {
      sidebar: [{ label: 'Site' }],
    };
    expect(deepMerge(shared, site)).toEqual({
      sidebar: [{ label: 'Site' }],
    });
  });

  it('concatenates plugin arrays', () => {
    const shared = {
      plugins: ['plugin-a'],
    };
    const site = {
      plugins: ['plugin-b'],
    };
    const result = deepMerge(shared, site);
    expect(result).toEqual({
      plugins: ['plugin-a', 'plugin-b'],
    });
  });

  it('concatenates integration arrays', () => {
    const shared = {
      integrations: ['int-a'],
    };
    const site = {
      integrations: ['int-b'],
    };
    const result = deepMerge(shared, site);
    expect(result).toEqual({
      integrations: ['int-a', 'int-b'],
    });
  });

  it('replaces navbar entirely', () => {
    const shared = {
      navbar: { title: 'Shared', items: [{ label: 'A' }] },
    };
    const site = {
      navbar: { items: [{ label: 'B' }] },
    };
    expect(deepMerge(shared, site)).toEqual({
      navbar: { items: [{ label: 'B' }] },
    });
  });

  it('merges mixed nested structures', () => {
    const shared = {
      defaults: {
        locale: 'en',
        theme: { defaultMode: 'dark' },
        plugins: ['p1'],
      },
    };
    const site = {
      defaults: {
        theme: { disableSwitch: true },
        plugins: ['p2'],
      },
    };
    const result = deepMerge(shared, site);
    expect(result).toEqual({
      defaults: {
        locale: 'en',
        theme: { defaultMode: 'dark', disableSwitch: true },
        plugins: ['p1', 'p2'],
      },
    });
  });

  it('handles empty objects', () => {
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
  });

  it('handles both empty objects', () => {
    expect(deepMerge({}, {})).toEqual({});
  });

  it('preserves shared keys not in site', () => {
    const shared = { a: 1, b: 2, c: 3 };
    const site = { b: 20 };
    expect(deepMerge(shared, site)).toEqual({ a: 1, b: 20, c: 3 });
  });
});

describe('mergeSidebar', () => {
  it('returns site sidebar when shared is undefined', () => {
    const site: SidebarConfig = [{ label: 'Site' }];
    expect(mergeSidebar(undefined, site)).toEqual(site);
  });

  it('returns site sidebar, replacing shared', () => {
    const shared: SidebarConfig = [{ label: 'Shared' }];
    const site: SidebarConfig = [{ label: 'Site' }];
    expect(mergeSidebar(shared, site)).toEqual(site);
  });

  it('returns site sidebar when both provided', () => {
    const shared: SidebarConfig = [
      { label: 'A', slug: 'a' },
      { label: 'B', autogenerate: { directory: 'b' } },
    ];
    const site: SidebarConfig = [
      { label: 'C', autogenerate: { directory: 'c' } },
    ];
    expect(mergeSidebar(shared, site)).toEqual(site);
  });
});
