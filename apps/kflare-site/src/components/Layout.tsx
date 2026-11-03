import { KFLARE } from '../content.ts';
import { Logo } from './Logo.tsx';
import { Container, ExternalLink } from './ui.tsx';

const { links } = KFLARE;

// Rooted at /, so they work from the 404 page too.
const NAV = [
  { href: '/#resources', label: 'Resources', className: 'hidden md:block' },
  { href: '/#features', label: 'Features', className: 'hidden md:block' },
  { href: '/#get-started', label: 'Get started', className: 'hidden sm:block' },
  { href: '/#roadmap', label: 'Roadmap', className: 'hidden lg:block' },
];

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-panel px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <Container className="flex h-15 items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <Logo className="size-7" />
          kflare
        </a>
        <nav aria-label="Main">
          <ul className="flex items-center gap-1 text-sm text-dim">
            {NAV.map(({ href, label, className }) => (
              <li key={href} className={className}>
                <a href={href} className="rounded-md px-3 py-2 transition-colors hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
            <li>
              <ExternalLink
                href={links.deploy}
                className="rounded-md px-3 py-2 transition-colors hover:text-ink"
              >
                Docs
              </ExternalLink>
            </li>
            <li>
              <ExternalLink
                href={links.repo}
                className="ml-1 rounded-lg border border-line bg-panel px-3 py-2 font-medium text-ink transition-colors hover:border-dim"
              >
                GitHub
              </ExternalLink>
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  );
}

const FOOTER = [
  {
    heading: 'Project',
    items: [
      ['Source on GitHub', links.repo],
      ['Releases', links.releases],
      ['Helm chart on Artifact Hub', links.artifactHub],
      ['Roadmap', links.roadmap],
    ],
  },
  {
    heading: 'Documentation',
    items: [
      ['Quickstart', links.quickstart],
      ['Deploy guide', links.deploy],
      ['Architecture', links.architecture],
      ['Changelog', links.changelog],
    ],
  },
  {
    heading: 'Community',
    items: [
      ['Discussions', links.discussions],
      ['Issues', links.issues],
      ['Contributing', links.contributing],
      ['Security policy', links.security],
      ['Code of Conduct', links.conduct],
      ['Governance', links.governance],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <a href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <Logo className="size-7" />
              kflare
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-dim">
              A Kubernetes operator that manages Cloudflare through custom resources.
            </p>
          </div>
          {FOOTER.map(({ heading, items }) => (
            <div key={heading}>
              <h2 className="text-sm font-semibold">{heading}</h2>
              <ul className="mt-3 space-y-2 text-sm text-dim">
                {items.map(([label, href]) => (
                  <li key={label}>
                    <ExternalLink href={href} className="transition-colors hover:text-ink">
                      {label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 space-y-2 border-t border-line pt-6 text-xs leading-relaxed text-faint">
          <p>
            © {KFLARE.copyright}. kflare is open source under the{' '}
            <ExternalLink href={links.license} className="underline-offset-2 hover:underline">
              MIT License
            </ExternalLink>
            .
          </p>
          <p>
            kflare is an independent project, not affiliated with or endorsed by Cloudflare, Inc.
            Cloudflare is a trademark of Cloudflare, Inc. Kubernetes is a registered trademark of
            the Linux Foundation.
          </p>
        </div>
      </Container>
    </footer>
  );
}
