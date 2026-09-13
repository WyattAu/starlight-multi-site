# @wyatt/starlight-multi-site

CLI tool and shared config factory for managing multiple Starlight documentation sites from a single monorepo.

Define each site in a declarative `manifest.toml`, share navbar/footer/theme config across sites, build sites incrementally with caching, and generate deploy workflows for Cloudflare Pages or GitHub Actions.

## Features

- **`manifest.toml`** — declarative site registry: name, path, domain, per-site overrides
- **Shared config factory** — `createConfig()` merges shared defaults with per-site overrides (sidebar merging included)
- **Zod-validated schemas** for site, manifest, and shared config
- **Incremental builds** — build orchestrator computes affected sites from content changes and skips up-to-date sites via cache
- **Deploy generators** — Cloudflare Pages config and GitHub Actions workflow generation
- **Shared content linking** — symlink shared content directories into each site

## Installation

```bash
npm install -g @wyatt/starlight-multi-site
# or use via npx
```

## Usage — CLI

```bash
starlight-multi-site --help
```

### Manifest format

```toml
# sites.toml (passed via --manifest; defaults to sites.toml)
[shared]
config = "shared.config.mjs"  # module exporting the shared SharedConfig
root = "."
output_dir = "dist"

[[sites]]
name = "docs"
title = "Docs Site"
domain = "docs.example.com"
content_dir = "sites/docs/content"
sidebar = []

[[sites]]
name = "api"
title = "API Site"
domain = "api.example.com"
content_dir = "sites/api/content"
sidebar = []
```

## Usage — config factory

```js
// sites/docs/astro.config.mjs
import { createConfig } from '@wyatt/starlight-multi-site';

export default createConfig({
  // site identity + Starlight overrides, merged with shared defaults
});
```

`createSite`, `deepMerge`, `mergeSidebar`, and the Zod schemas (`SiteConfigSchema`, `SiteManifestSchema`, `SharedConfigSchema`, `validateNoDuplicateSites`) are exported for custom tooling.

## Build orchestration & deploy

The library exports `parseManifest`, `getAffectedSites`, `createCacheManager`, and `BuildOrchestrator` for building only the sites affected by a change, plus `deployToCloudflare`, `generateWorkflow`, and `generateAllWorkflows` for deploy targets. Template files (`astro.config.base.mjs`, `deploy-workflow.yml`) ship with the package.

## Peer dependencies

`astro` and `@astrojs/starlight` are optional peers — the CLI works standalone, and the config factory is used inside Starlight sites.

## License

MIT
