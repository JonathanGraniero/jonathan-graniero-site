import { renderToString } from 'react-dom/server';
import { docPages } from './docs/pages.tsx';
import { PAGES, type PageName } from './pages.ts';

/** Renders a page the browser hydrates (index.html's) at build time, for scripts/prerender.mjs. */
export function render(name: PageName): string {
  const Page = PAGES[name];
  return renderToString(<Page />);
}

/** Every docs page as static HTML (docs.html's), which the browser doesn't hydrate. */
export function renderDocs(): { path: string; title: string; description: string; html: string }[] {
  return docPages().map(({ element, ...page }) => ({ ...page, html: renderToString(element) }));
}
