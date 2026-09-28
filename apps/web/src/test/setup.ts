import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server.ts';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  // Node's fetch rejects relative URLs; resolve them against the jsdom origin
  // (installed after MSW so it wraps MSW's interceptor).
  const mswFetch = globalThis.fetch;
  globalThis.fetch = (input, init) =>
    mswFetch(
      typeof input === 'string' && input.startsWith('/') ? new URL(input, location.origin) : input,
      init,
    );
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});

afterAll(() => server.close());
