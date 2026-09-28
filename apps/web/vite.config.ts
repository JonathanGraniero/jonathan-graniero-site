/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
