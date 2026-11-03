import { renderToString } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import { headings } from './headings.ts';

const markdown = [
  '# Deploying kflare with Helm',
  '## 1. Create a Cloudflare API token',
  '```sh',
  '## not a heading',
  '# NAME   READY',
  '```',
  '## The `kflare.dev/paused` annotation',
  '### With [Argo CD](https://argo-cd.readthedocs.io/) or Flux',
  '## Monitoring',
  '## Monitoring',
].join('\n');

describe('headings', () => {
  it('finds the headings outside code, with their text', () => {
    expect(headings(markdown)).toEqual([
      { depth: 1, text: 'Deploying kflare with Helm', id: 'deploying-kflare-with-helm' },
      { depth: 2, text: '1. Create a Cloudflare API token', id: '1-create-a-cloudflare-api-token' },
      { depth: 2, text: 'The kflare.dev/paused annotation', id: 'the-kflaredevpaused-annotation' },
      { depth: 3, text: 'With Argo CD or Flux', id: 'with-argo-cd-or-flux' },
      { depth: 2, text: 'Monitoring', id: 'monitoring' },
      { depth: 2, text: 'Monitoring', id: 'monitoring-1' },
    ]);
  });

  it('gives the ids rehype-slug gives the rendered page', () => {
    const html = renderToString(
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {markdown}
      </Markdown>,
    );
    const rendered = [...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map((m) => m[1]);
    expect(headings(markdown).map((h) => h.id)).toEqual(rendered);
  });
});
