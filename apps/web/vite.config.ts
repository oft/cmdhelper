import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@articles': fileURLToPath(
        new URL('../../articles/index.ts', import.meta.url),
      ),
    },
  },
  base: '/cmdhelper/',
  build: { outDir: '../../docs', emptyOutDir: true },
});
