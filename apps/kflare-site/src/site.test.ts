import { describe, expect, it } from 'vitest';
import { KIND_COUNT } from './content.ts';
import { render, renderDocs } from './entry-server.tsx';

// Every pre-rendered page, as scripts/prerender.mjs writes them.
const pages = [
  { path: '/', html: render('home') },
  { path: '/404', html: render('not-found') },
  ...renderDocs().map(({ path, html }) => ({ path, html })),
].map(({ path, html }) => ({
  path,
  doc: new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html'),
}));
const byPath = new Map(pages.map((p) => [p.path, p.doc]));

describe.each(pages.map((p) => [p.path, p.doc] as const))('%s', (path, doc) => {
  it('has one h1, and no id twice', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    const ids = [...doc.querySelectorAll('[id]')].map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('links only to pages and anchors that exist', () => {
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href')!;
      if (/^https?:/.test(href)) continue;
      const [target = '', hash] = href.split('#');
      const page = target === '' ? doc : byPath.get(target);
      expect(page, `${href} on ${path}`).toBeDefined();
      if (hash) expect(page!.getElementById(hash), `${href} on ${path}`).not.toBeNull();
    }
  });

  it('opens other sites in a new tab, without handing them the page', () => {
    for (const a of doc.querySelectorAll('a[href^="http"]')) {
      expect(a.getAttribute('target'), a.getAttribute('href')!).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });
});

it('pre-renders an overview, two guides and a page per kind', () => {
  const docs = pages.map((p) => p.path).filter((p) => p.startsWith('/docs/'));
  expect(docs.slice(0, 3)).toEqual(['/docs/', '/docs/deploy/', '/docs/architecture/']);
  expect(docs.filter((p) => p.startsWith('/docs/reference/'))).toHaveLength(KIND_COUNT);
});
