import { defineConfig, mergeConfig } from 'vite';
import githubPagesConfig from './vite.github-pages.config';

export default mergeConfig(githubPagesConfig, defineConfig({
  base: '/',
  define: { 'import.meta.env.VITE_PRESENTATION_PATH': JSON.stringify('/') },
  build: { outDir: 'cloudflare-pages-dist' },
}));
