import { z } from 'zod';

export const NavbarItemSchema = z.object({
  type: z.string().optional(),
  label: z.string(),
  position: z.enum(['left', 'right']).optional(),
  to: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
});

export const NavbarConfigSchema = z.object({
  title: z.string().optional(),
  logo: z
    .object({
      src: z.string(),
      alt: z.string().optional(),
      srcDark: z.string().optional(),
    })
    .optional(),
  items: z.array(NavbarItemSchema),
});

export const FooterLinkSchema = z.object({
  label: z.string(),
  to: z.string().optional(),
  href: z.string().optional(),
});

export const FooterGroupSchema = z.object({
  title: z.string(),
  items: z.array(FooterLinkSchema),
});

export const FooterConfigSchema = z.object({
  style: z.enum(['dark', 'light']).optional(),
  links: z.array(FooterGroupSchema),
  copyright: z.string().optional(),
});

export const SidebarItemSchema: z.ZodType = z.lazy(() =>
  z.object({
    label: z.string().optional(),
    slug: z.string().optional(),
    autogenerate: z
      .object({
        directory: z.string(),
      })
      .optional(),
    items: z.array(SidebarItemSchema).optional(),
    collapsed: z.boolean().optional(),
  }),
);

export const SidebarConfigSchema = z.array(SidebarItemSchema);

export const ThemeConfigSchema = z.object({
  defaultMode: z.enum(['dark', 'light']).optional(),
  disableSwitch: z.boolean().optional(),
  respectPrefersColorScheme: z.boolean().optional(),
  colors: z
    .object({
      light: z.record(z.string()).optional(),
      dark: z.record(z.string()).optional(),
    })
    .optional(),
});

export const SharedConfigSchema = z.object({
  defaults: z.object({
    locale: z.string(),
    theme: ThemeConfigSchema,
    plugins: z.array(z.unknown()),
    integrations: z.array(z.unknown()),
    navbar: NavbarConfigSchema.optional(),
    footer: FooterConfigSchema.optional(),
    sidebar: SidebarConfigSchema.optional(),
  }),
  shared: z.object({
    components: z.string().optional(),
    styles: z.string().optional(),
    content: z.string().optional(),
    assets: z.string().optional(),
  }),
  deploy: z.object({
    platform: z.enum(['cloudflare', 'vercel', 'netlify']),
    domain: z.string(),
    branch: z.string().optional(),
  }),
});

const siteNameRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export const SiteConfigSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .regex(
        siteNameRegex,
        'Site name must be non-empty, lowercase alphanumeric with hyphens (no leading/trailing hyphens)',
      ),
    title: z.string().min(1),
    tagline: z.string().optional(),
    domain: z.string().min(1),
    contentDir: z.string().min(1),
    sidebar: SidebarConfigSchema,
    overrides: z
      .object({
        locale: z.string().optional(),
        theme: ThemeConfigSchema.optional(),
        plugins: z.array(z.unknown()).optional(),
        integrations: z.array(z.unknown()).optional(),
        navbar: NavbarConfigSchema.optional(),
        footer: FooterConfigSchema.optional(),
        sidebar: SidebarConfigSchema.optional(),
      })
      .optional(),
    deployOverrides: z
      .object({
        domain: z.string().optional(),
        branch: z.string().optional(),
        projectName: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export const SiteManifestSchema = z
  .object({
    shared: z.string(),
    root: z.string(),
    outputDir: z.string(),
    sites: z.array(SiteConfigSchema),
  })
  .strict();

export interface ManifestToml {
  shared: {
    config: string;
    root: string;
    output_dir: string;
  };
  sites: Array<{
    name: string;
    title: string;
    tagline?: string;
    domain: string;
    content_dir: string;
    sidebar: unknown;
    overrides?: unknown;
    deploy_overrides?: {
      domain?: string;
      branch?: string;
      project_name?: string;
    };
  }>;
}

export function validateNoDuplicateSites(
  sites: z.infer<typeof SiteConfigSchema>[],
): void {
  const names = new Set<string>();
  const domains = new Set<string>();

  for (const site of sites) {
    if (names.has(site.name)) {
      throw new Error(`Duplicate site name: "${site.name}"`);
    }
    if (domains.has(site.domain)) {
      throw new Error(`Duplicate site domain: "${site.domain}"`);
    }
    names.add(site.name);
    domains.add(site.domain);
  }
}
