import fs from 'fs-extra';
import path from 'node:path';
import type { SiteConfig } from '../config/types.js';

export interface WorkflowGeneratorOptions {
  sharedPaths?: string[];
  customPaths?: Record<string, string[]>;
  secrets?: string[];
  compositeAction?: string;
  nodeMemory?: string;
  timeoutMinutes?: number;
}

export interface GeneratedWorkflow {
  siteName: string;
  fileName: string;
  content: string;
}

function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function generateWorkflow(
  site: SiteConfig,
  options: WorkflowGeneratorOptions = {},
): GeneratedWorkflow {
  const {
    sharedPaths = [],
    customPaths,
    secrets = [],
    compositeAction = './.github/actions/starlight-build',
    nodeMemory = '7168',
    timeoutMinutes = 60,
  } = options;

  const siteSlug = snakeCase(site.name);
  const displayName = site.title;
  const projectName =
    site.deployOverrides?.projectName ?? `wyattsnotes-${site.name}`;
  const deployUrl = `https://${site.domain}`;
  const concurrencyGroup = `deploy-${siteSlug}-\${{ github.ref }}`;

  const contentPaths = [`${site.contentDir}/**`];
  const configPaths = [...sharedPaths];
  const workflowPaths = [`.github/workflows/deploy-${siteSlug}.yml`];

  if (customPaths?.[site.name]) {
    contentPaths.push(...customPaths[site.name]);
  }

  const allPaths = [...contentPaths, ...configPaths, ...workflowPaths];

  const secretLines = secrets
    .map((s) => `          ${s}: \${{ secrets.${toEnvName(s)} }}`)
    .join('\n');

  const workflow = `name: Deploy ${displayName} to Cloudflare Pages

permissions:
  contents: read

on:
  push:
    branches: [main]
    paths:
${allPaths.map((p) => `      - '${p}'`).join('\n')}
  workflow_dispatch:

concurrency:
  group: ${concurrencyGroup}
  cancel-in-progress: true

jobs:
  deploy:
    name: Build and Deploy ${displayName}
    runs-on: ubuntu-latest
    timeout-minutes: ${timeoutMinutes}
    steps:
      - uses: actions/checkout@v4

      - uses: ${compositeAction}
        with:
          site-name: ${site.name}
          project-name: ${projectName}
          deploy-url: '${deployUrl}'
          node-memory: '${nodeMemory}'${secretLines ? '\n' + secretLines : ''}
`;

  return {
    siteName: site.name,
    fileName: `deploy-${siteSlug}.yml`,
    content: workflow,
  };
}

export function generateAllWorkflows(
  sites: SiteConfig[],
  options: WorkflowGeneratorOptions = {},
): GeneratedWorkflow[] {
  return sites.map((site) => generateWorkflow(site, options));
}

export async function writeWorkflows(
  workflows: GeneratedWorkflow[],
  outputDir: string,
): Promise<string[]> {
  await fs.ensureDir(outputDir);

  const written: string[] = [];
  for (const workflow of workflows) {
    const filePath = path.join(outputDir, workflow.fileName);
    await fs.writeFile(filePath, workflow.content, 'utf-8');
    written.push(filePath);
  }

  return written;
}

function toEnvName(secret: string): string {
  return secret
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase();
}
