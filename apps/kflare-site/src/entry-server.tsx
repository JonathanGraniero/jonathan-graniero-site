import { renderToString } from 'react-dom/server';
import { PAGES, type PageName } from './pages.ts';

/** Renders a page to HTML at build time, for scripts/prerender.mjs. */
export function render(name: PageName): string {
  const Page = PAGES[name];
  return renderToString(<Page />);
}
