/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import kflare from '../kflare-site/kflare/release.json' with { type: 'json' };

/**
 * Publishes the kflare release the build read as /kflare-source.json, which
 * .github/workflows/watch-kflare.yml compares with GitHub's latest release.
 */
function kflareSource(): Plugin {
  return {
    name: 'kflare-source',
    apply: 'build',
    generateBundle() {
      const { tag, commit } = kflare.source;
      this.emitFile({
        type: 'asset',
        fileName: 'kflare-source.json',
        source: `${JSON.stringify({ tag, commit })}\n`,
      });
    },
  };
}

const API_TARGET = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss(), kflareSource()],
  server: {
    port: 5173,
    // Fail loudly instead of silently moving to 5174 when a dev server is already running.
    strictPort: true,
    // Same-origin in dev (and behind the reverse proxy in prod), so the
    // httpOnly session cookie just works and there is no CORS preflight.
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
  build: {
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
