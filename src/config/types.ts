export interface ThemeConfig {
  defaultMode?: 'dark' | 'light';
  disableSwitch?: boolean;
  respectPrefersColorScheme?: boolean;
  colors?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
}

export interface NavbarItem {
  type?: string;
  label: string;
  position?: 'left' | 'right';
  to?: string;
  href?: string;
  icon?: string;
}

export interface NavbarConfig {
  title?: string;
  logo?: {
    src: string;
    alt?: string;
    srcDark?: string;
  };
  items: NavbarItem[];
}

export interface FooterLink {
  label: string;
  to?: string;
  href?: string;
}

export interface FooterGroup {
  title: string;
  items: FooterLink[];
}

export interface FooterConfig {
  style?: 'dark' | 'light';
  links: FooterGroup[];
  copyright?: string;
}

export interface SidebarItem {
  label?: string;
  slug?: string;
  autogenerate?: {
    directory: string;
  };
  items?: SidebarItem[];
  collapsed?: boolean;
}

export type SidebarConfig = SidebarItem[];

export interface SharedConfig {
  defaults: {
    locale: string;
    theme: ThemeConfig;
    plugins: StarlightPlugin[];
    integrations: AstroIntegration[];
    navbar?: NavbarConfig;
    footer?: FooterConfig;
    sidebar?: SidebarConfig;
  };
  shared: {
    components?: string;
    styles?: string;
    content?: string;
    assets?: string;
  };
  deploy: {
    platform: 'cloudflare' | 'vercel' | 'netlify';
    domain: string;
    branch?: string;
  };
}

export interface SiteConfig {
  name: string;
  title: string;
  tagline?: string;
  domain: string;
  contentDir: string;
  sidebar: SidebarConfig;
  overrides?: Partial<SharedConfig['defaults']>;
  deployOverrides?: {
    domain?: string;
    branch?: string;
    projectName?: string;
  };
}

export interface SiteManifest {
  shared: string;
  root: string;
  outputDir: string;
  sites: SiteConfig[];
}

export interface BuildOptions {
  concurrency?: number;
  dryRun?: boolean;
  sharedCache?: string;
  verbose?: boolean;
}

export interface BuildResult {
  site: string;
  success: boolean;
  duration: number;
  outputSize?: number;
  outputPath?: string;
  error?: string;
}

export type StarlightPlugin = unknown;
export type AstroIntegration = unknown;

export interface AstroUserConfig {
  site?: string;
  outDir?: string;
  srcDir?: string;
  integrations?: AstroIntegration[];
  [key: string]: unknown;
}
