import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mdx from '@astrojs/mdx';
import { createConfig } from '@wyatt/starlight-multi-site';

const shared = {
  defaults: {
    locale: 'en',
    theme: {},
    plugins: [
      starlight({
        title: 'Multi Scratch',
        sidebar: [{ label: 'Guide', autogenerate: { directory: 'guide' } }],
      }),
    ],
    integrations: [mdx()],
  },
  shared: {},
};

export default defineConfig(
  createConfig(
    shared,
    {
      name: 'alpha',
      title: 'Alpha Site',
      domain: 'alpha.example.com',
      contentDir: 'src/content/docs',
      sidebar: {},
    },
    { rootDir: new URL('.', import.meta.url).pathname, outputDir: 'dist' },
  ),
);
