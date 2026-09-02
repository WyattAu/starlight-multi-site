import { describe, it, expect } from 'vitest';
import {
  generateWorkflow,
  generateAllWorkflows,
} from '../src/deploy/github-actions.js';
import type { SiteConfig } from '../src/config/types.js';

const baseSite: SiteConfig = {
  name: 'ib',
  title: "Wyatt's Notes - IB",
  domain: 'ib.wyattau.com',
  contentDir: './docs/docs_ib',
  sidebar: [{ autogenerate: { directory: 'docs' } }],
};

describe('generateWorkflow', () => {
  it('generates valid YAML with correct site info', () => {
    const result = generateWorkflow(baseSite);
    expect(result.siteName).toBe('ib');
    expect(result.fileName).toBe('deploy-ib.yml');
    expect(result.content).toContain("Deploy Wyatt's Notes - IB");
    expect(result.content).toContain('ib.wyattau.com');
  });

  it('includes path triggers for content', () => {
    const result = generateWorkflow(baseSite);
    expect(result.content).toContain('./docs/docs_ib/**');
  });

  it('includes shared path triggers', () => {
    const result = generateWorkflow(baseSite, {
      sharedPaths: ['src/**', 'package.json'],
    });
    expect(result.content).toContain('src/**');
    expect(result.content).toContain('package.json');
  });

  it('includes workflow_dispatch trigger', () => {
    const result = generateWorkflow(baseSite);
    expect(result.content).toContain('workflow_dispatch');
  });

  it('includes concurrency group', () => {
    const result = generateWorkflow(baseSite);
    expect(result.content).toContain('concurrency');
    expect(result.content).toContain('deploy-ib-');
  });

  it('uses deploy overrides for project name', () => {
    const site: SiteConfig = {
      ...baseSite,
      deployOverrides: { projectName: 'custom-project' },
    };
    const result = generateWorkflow(site);
    expect(result.content).toContain('custom-project');
  });

  it('defaults project name to wyattsnotes-{name}', () => {
    const result = generateWorkflow(baseSite);
    expect(result.content).toContain('wyattsnotes-ib');
  });

  it('includes secrets when provided', () => {
    const result = generateWorkflow(baseSite, {
      secrets: ['CLOUDFLARE_API_TOKEN', 'SENTRY_DSN'],
    });
    expect(result.content).toContain('CLOUDFLARE_API_TOKEN');
    expect(result.content).toContain('SENTRY_DSN');
  });

  it('handles hyphenated site names', () => {
    const site: SiteConfig = {
      ...baseSite,
      name: 'alevel-maths-physics',
      title: 'A-Level Maths & Physics',
      domain: 'alevel-maths-physics.wyattau.com',
    };
    const result = generateWorkflow(site);
    expect(result.fileName).toBe('deploy-alevel-maths-physics.yml');
    expect(result.content).toContain('deploy-alevel-maths-physics-');
  });

  it('uses composite action when specified', () => {
    const result = generateWorkflow(baseSite, {
      compositeAction: './.github/actions/custom-build',
    });
    expect(result.content).toContain('./.github/actions/custom-build');
  });

  it('uses default timeout of 60 minutes', () => {
    const result = generateWorkflow(baseSite);
    expect(result.content).toContain('timeout-minutes: 60');
  });

  it('uses custom timeout when specified', () => {
    const result = generateWorkflow(baseSite, { timeoutMinutes: 30 });
    expect(result.content).toContain('timeout-minutes: 30');
  });
});

describe('generateAllWorkflows', () => {
  it('generates a workflow for each site', () => {
    const sites: SiteConfig[] = [
      { ...baseSite, name: 'site-a', domain: 'a.com', contentDir: './docs/a', sidebar: [] },
      { ...baseSite, name: 'site-b', domain: 'b.com', contentDir: './docs/b', sidebar: [] },
    ];
    const workflows = generateAllWorkflows(sites);
    expect(workflows).toHaveLength(2);
    expect(workflows[0].siteName).toBe('site-a');
    expect(workflows[1].siteName).toBe('site-b');
  });

  it('passes options through to each workflow', () => {
    const sites: SiteConfig[] = [baseSite];
    const workflows = generateAllWorkflows(sites, {
      sharedPaths: ['src/**'],
    });
    expect(workflows[0].content).toContain('src/**');
  });
});
