export { createConfig, createSite } from './create-config.js';
export type { CreateConfigOptions } from './create-config.js';
export { deepMerge, mergeSidebar } from './merge.js';
export * from './types.js';
export {
  SiteConfigSchema,
  SiteManifestSchema,
  SharedConfigSchema,
  validateNoDuplicateSites,
} from './site-schema.js';
export type { ManifestToml } from './site-schema.js';
