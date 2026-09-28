import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ApiError } from './lib/api.ts';
import { ThemeProvider } from './lib/theme.tsx';
import { createRouter } from './router.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Client errors (404, 401…) won't fix themselves on retry.
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

// A page's code chunk can go missing if the tab outlived a deploy or a dev
// server restart. Reload once to pick up fresh assets instead of erroring.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'chunk-reload-at';
  try {
    const last = Number(sessionStorage.getItem(key));
    if (Date.now() - last < 10_000) return; // already retried; let the error page show
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage unavailable: still reload once */
  }
  event.preventDefault();
  window.location.reload();
});

const router = createRouter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
