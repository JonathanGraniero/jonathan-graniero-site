import type { ReactNode } from 'react';
import { DocsIndex } from './DocsIndex.tsx';
import { DocsLayout } from './DocsLayout.tsx';
import { GuidePage } from './GuidePage.tsx';
import { KindPage } from './KindPage.tsx';
import { GUIDES } from './links.ts';
import { KINDS, kindPath } from './reference.ts';

export interface DocPage {
  /** Ends in /: Workers serves it from <path>index.html. */
  path: string;
  title: string;
  description: string;
  element: ReactNode;
}

function page(path: string, title: string, description: string, body: ReactNode): DocPage {
  return { path, title, description, element: <DocsLayout path={path}>{body}</DocsLayout> };
}

/** Every docs page, pre-rendered to static HTML by scripts/prerender.mjs. */
export function docPages(): DocPage[] {
  return [
    page(
      '/docs/',
      'kflare documentation',
      'The kflare documentation: a reference for every resource kind, with every field and an example, and guides to deploying and running kflare.',
      <DocsIndex />,
    ),
    page(
      GUIDES.deploy.path,
      'Deploying kflare · kflare docs',
      'Install kflare with Helm, Argo CD or Flux, connect a Cloudflare account, and run it in production: configuration, monitoring, upgrades and troubleshooting.',
      <GuidePage name="deploy" />,
    ),
    page(
      GUIDES.architecture.path,
      'Architecture · kflare docs',
      'How kflare finds, owns, corrects and deletes Cloudflare objects, and its known limitations.',
      <GuidePage name="architecture" />,
    ),
    ...KINDS.map((doc) =>
      page(
        kindPath(doc.kind),
        `${doc.kind} reference · kflare docs`,
        `The kflare ${doc.kind} reference: every field with an example, the rules the API server checks, its status, and samples.`,
        <KindPage doc={doc} />,
      ),
    ),
  ];
}
