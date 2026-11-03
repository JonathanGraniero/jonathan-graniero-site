/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const entry = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    // apps/web's dev server holds 5173.
    port: 5174,
    strictPort: true,
  },
  build: {
    // Emit every font subset as a file: public/_headers allows fonts from 'self' only, not data: URIs.
    assetsInlineLimit: 0,
    // Two templates for scripts/prerender.mjs: the hydrated pages' and the
    // static docs pages'. The SSR build (--ssr) keeps its own entry.
    ...(!isSsrBuild && {
      rolldownOptions: { input: { main: entry('index.html'), docs: entry('docs.html') } },
    }),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
}));
