import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://typing-1-1-2.github.io',
  base: '/karuta-web-manager',
  output: 'static',
  build: {
    assets: '_assets',
  },
});
