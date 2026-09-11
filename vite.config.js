import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // Keep local development at / and build GitHub Pages for the repository path.
  base: mode === 'github-pages' ? '/crunchy-squish-lab/' : '/',
}));
