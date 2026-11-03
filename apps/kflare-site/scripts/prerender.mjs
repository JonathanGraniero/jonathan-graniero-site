// Pre-renders kflare.dev after `vite build`. The client build's HTML entries
// are the templates, and the SSR build in dist-server/ renders each page into
// one, so the HTML is complete without JavaScript (crawlers, link previews,
// anyone checking the site):
//   - index.html: the home page and 404.html, which src/main.tsx hydrates.
//   - docs.html: every docs page, at <path>index.html. They stay static; their
//     only script is src/docs-client.ts.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const SITE = 'https://kflare.dev';
const PLACEHOLDER = '<!--app-html-->';
const dist = new URL('../dist/', import.meta.url);
const serverBuild = new URL('../dist-server/', import.meta.url);

const { render, renderDocs } = await import(new URL('entry-server.js', serverBuild).href);

async function template(name) {
  const html = await readFile(new URL(name, dist), 'utf8');
  if (!html.includes(PLACEHOLDER)) {
    throw new Error(`dist/${name} has no ${PLACEHOLDER} placeholder to render into`);
  }
  return html;
}

// A function replacement, so `$` sequences in the page are never read as patterns.
const fill = (html, body) => html.replace(PLACEHOLDER, () => body);

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The page's own title, description and URL in the template's head. */
function head(html, { path, title, description }) {
  // Each pattern captures what comes before the value it replaces.
  const swaps = [
    [/(<title>)[^<]*/, attr(title)],
    [/(<meta\s+name="description"\s+content=")[^"]*/, attr(description)],
    [/(<link rel="canonical" href=")[^"]*/, SITE + path],
    [/(<meta property="og:url" content=")[^"]*/, SITE + path],
    [/(<meta property="og:title" content=")[^"]*/, attr(title)],
    [/(<meta\s+property="og:description"\s+content=")[^"]*/, attr(description)],
  ];
  return swaps.reduce((out, [pattern, value]) => {
    if (!pattern.test(out)) throw new Error(`docs.html has no match for ${pattern}`);
    return out.replace(pattern, (_, before) => before + value);
  }, html);
}

const home = await template('index.html');
await writeFile(new URL('index.html', dist), fill(home, render('home')));

// Served with status 404 for any path without an asset (wrangler.jsonc).
const notFound = fill(home, render('not-found'))
  .replace('<div id="root">', '<div id="root" data-page="not-found">')
  .replace(
    /<title>[^<]*<\/title>/,
    '<title>Page not found · kflare</title>\n    <meta name="robots" content="noindex" />',
  );
await writeFile(new URL('404.html', dist), notFound);

const docs = await template('docs.html');
const pages = renderDocs();
for (const page of pages) {
  const file = new URL(`.${page.path}index.html`, dist);
  await mkdir(new URL('.', file), { recursive: true });
  await writeFile(file, fill(head(docs, page), page.html));
}
await rm(new URL('docs.html', dist));

const urls = ['/', ...pages.map((p) => p.path)].map((p) => `  <url><loc>${SITE}${p}</loc></url>`);
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
);

await rm(serverBuild, { recursive: true, force: true });
console.log(`Pre-rendered the home page, 404.html and ${pages.length} docs pages`);
