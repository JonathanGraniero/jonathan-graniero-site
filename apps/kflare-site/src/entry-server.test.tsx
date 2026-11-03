import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from './entry-server.tsx';
import { PAGES, type PageName } from './pages.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

/** Renders as scripts/prerender.mjs does, in Node, where there is no DOM. */
function renderWithoutDom(name: PageName): string {
  vi.stubGlobal('window', undefined);
  vi.stubGlobal('document', undefined);
  try {
    return render(name);
  } finally {
    vi.unstubAllGlobals();
  }
}

describe.each(Object.keys(PAGES) as PageName[])('the pre-rendered %s page', (name) => {
  it('renders to HTML that the browser hydrates without a mismatch', async () => {
    const html = renderWithoutDom(name);
    expect(html).toContain('<main id="main"');

    const root = document.createElement('div');
    root.innerHTML = html;
    document.body.append(root);
    const heading = root.querySelector('h1');
    const errors: unknown[] = [];
    const Page = PAGES[name];
    await act(async () => {
      hydrateRoot(root, <Page />, { onRecoverableError: (error) => errors.push(error) });
    });
    expect(errors).toEqual([]);
    // React adopted the server's DOM rather than rendering its own.
    expect(heading).not.toBeNull();
    expect(root.querySelector('h1')).toBe(heading);
  });
});
