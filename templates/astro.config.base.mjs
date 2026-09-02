import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default function createBaseConfig(options) {
  return defineConfig({
    output: 'static',
    integrations: [
      starlight({
        title: options.title,
        locale: options.locale ?? 'en',
        sidebar: options.sidebar ?? [],
      }),
    ],
    build: {
      assets: '_assets',
    },
    vite: {
      resolve: {
        alias: options.aliases ?? {},
      },
    },
  });
}
