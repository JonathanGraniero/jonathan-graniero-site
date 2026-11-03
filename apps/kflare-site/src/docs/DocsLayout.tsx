import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader, SkipLink } from '../components/Layout.tsx';
import { Container } from '../components/ui.tsx';
import { AREAS } from '../content.ts';
import { GUIDES } from './links.ts';
import { kindPath } from './reference.ts';

interface NavLink {
  href: string;
  label: string;
  code?: boolean;
}

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Start here',
    links: [
      { href: '/docs/', label: 'Overview' },
      { href: '/#get-started', label: 'Quickstart' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { href: GUIDES.deploy.path, label: 'Deploying kflare' },
      { href: GUIDES.architecture.path, label: 'Architecture' },
    ],
  },
  ...AREAS.map(({ area, kinds }) => ({
    title: area,
    links: kinds.map(({ kind }) => ({ href: kindPath(kind), label: kind, code: true })),
  })),
];

function DocsNav({ path }: { path: string }) {
  return (
    <nav aria-label="Documentation" className="space-y-6 text-sm">
      {GROUPS.map(({ title, links }) => (
        <div key={title}>
          {/* Not a heading: the sidebar comes before the page's h1. */}
          <p className="text-xs font-semibold tracking-wider text-faint uppercase">{title}</p>
          <ul className="mt-2 space-y-0.5">
            {links.map(({ href, label, code }) => (
              <li key={href}>
                <a
                  href={href}
                  aria-current={href === path ? 'page' : undefined}
                  className={`block rounded-md px-2 py-1 text-dim transition-colors hover:bg-accent-soft hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent ${code ? 'font-mono text-[13px]' : ''}`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** A docs page: the site's header and footer around a sidebar and the page. */
export function DocsLayout({ path, children }: { path: string; children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader current="docs" />
      <Container className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-15 max-h-[calc(100dvh-3.75rem)] overflow-y-auto py-10 pr-2">
            <DocsNav path={path} />
          </div>
        </aside>
        <main id="main" className="min-w-0 py-8 lg:py-12">
          {/* Below lg the sidebar folds into this; <details> needs no script. */}
          <details className="mb-8 rounded-lg border border-line bg-panel lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Documentation menu
            </summary>
            <div className="border-t border-line px-3 py-4">
              <DocsNav path={path} />
            </div>
          </details>
          {children}
        </main>
      </Container>
      <SiteFooter />
    </>
  );
}

/** The trail above a page's title. */
export function Breadcrumb({ trail }: { trail: string[] }) {
  return (
    <p className="text-xs text-faint">
      <a href="/docs/" className="hover:text-accent">
        Docs
      </a>
      {trail.map((t) => (
        <span key={t}> / {t}</span>
      ))}
    </p>
  );
}
