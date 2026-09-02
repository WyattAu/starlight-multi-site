import path from 'node:path';
import { execa } from 'execa';
import type { SiteConfig } from '../config/types.js';

export interface CloudflareDeployOptions {
  site: SiteConfig;
  outputDir: string;
  accountId?: string;
  apiToken?: string;
  branch?: string;
  commitMessage?: string;
  dryRun?: boolean;
}

export interface CloudflareDeployResult {
  site: string;
  success: boolean;
  url?: string;
  error?: string;
}

export async function deployToCloudflare(
  options: CloudflareDeployOptions,
): Promise<CloudflareDeployResult> {
  const {
    site,
    outputDir,
    accountId,
    apiToken,
    branch,
    commitMessage,
    dryRun,
  } = options;

  const projectName =
    site.deployOverrides?.projectName ?? `wyattsnotes-${site.name}`;

  const args = [
    'pages',
    'deploy',
    outputDir,
    '--project-name',
    projectName,
  ];

  if (branch) {
    args.push('--branch', branch);
  }

  if (commitMessage) {
    args.push('--commit-message', commitMessage);
  }

  if (dryRun) {
    return {
      site: site.name,
      success: true,
      url: `https://${site.domain}`,
    };
  }

  const env: Record<string, string> = {};
  if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;
  if (apiToken) env.CLOUDFLARE_API_TOKEN = apiToken;

  try {
    const result = await execa('wrangler', args, {
      cwd: path.resolve(outputDir, '..'),
      env: { ...process.env, ...env },
      reject: true,
    });

    const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
    const deployUrl = urlMatch?.[0] ?? `https://${site.domain}`;

    return {
      site: site.name,
      success: true,
      url: deployUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      site: site.name,
      success: false,
      error: message,
    };
  }
}

export function getCloudflareProjectName(site: SiteConfig): string {
  return site.deployOverrides?.projectName ?? `wyattsnotes-${site.name}`;
}
