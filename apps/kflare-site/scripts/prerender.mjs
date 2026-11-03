// Pre-renders kflare.dev after `vite build`. The client build's index.html is
// the template, and the SSR build in dist-server/ renders each page into it, so
// the HTML is complete without JavaScript (crawlers, link previews, anyone
// checking the site). src/main.tsx then hydrates it.
import { readFile, rm, writeFile } from 'node:fs/promises';

const PLACEHOLDER = '<!--app-html-->';
const dist = new URL('../dist/', import.meta.url);
const serverBuild = new URL('../dist-server/', import.meta.url);

const { render } = await import(new URL('entry-server.js', serverBuild).href);
const template = await readFile(new URL('index.html', dist), 'utf8');
if (!template.includes(PLACEHOLDER)) {
  throw new Error(`dist/index.html has no ${PLACEHOLDER} placeholder to render into`);
}

// A function replacement, so `$` sequences in the page are never read as patterns.
const fill = (html) => template.replace(PLACEHOLDER, () => html);

await writeFile(new URL('index.html', dist), fill(render('home')));

// Served with status 404 for any path without an asset (wrangler.jsonc).
const notFound = fill(render('not-found'))
  .replace('<div id="root">', '<div id="root" data-page="not-found">')
  .replace(
    /<title>[^<]*<\/title>/,
    '<title>Page not found · kflare</title>\n    <meta name="robots" content="noindex" />',
  );
await writeFile(new URL('404.html', dist), notFound);

await rm(serverBuild, { recursive: true, force: true });
console.log('Pre-rendered dist/index.html and dist/404.html');
