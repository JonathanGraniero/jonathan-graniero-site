import type { ReactNode } from 'react';
import { CodeBlock, ManifestWindow } from './components/Code.tsx';
import { Icon } from './components/Icon.tsx';
import { SiteFooter, SiteHeader, SkipLink } from './components/Layout.tsx';
import { ButtonLink, C, Container, ExternalLink, Section, WithCode } from './components/ui.tsx';
import {
  AREAS,
  DOCS,
  FEATURES,
  HERO_MANIFEST,
  HERO_SESSION,
  KFLARE,
  KIND_COUNT,
  NEXT_RELEASE,
  QUALITY,
  QUICKSTART,
  ROADMAP,
  kindPath,
} from './content.ts';

const { links } = KFLARE;

const textLink = 'font-medium text-accent underline-offset-4 hover:underline';

/** kflare.dev's one page. */
export function App() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <Hero />
        <Highlights />
        <Resources />
        <Features />
        <GetStarted />
        <Quality />
        <Roadmap />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  const facts = [
    ['Kubernetes', `${KFLARE.requires.kubernetes} or newer`],
    ['Helm', `${KFLARE.requires.helm} or newer`],
    ['Images', KFLARE.platforms],
    ['License', KFLARE.license],
  ] as const;
  return (
    <div className="relative isolate overflow-hidden">
      <div className="grid-backdrop absolute inset-0 -z-10" aria-hidden="true" />
      <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-14 lg:py-24">
        <div>
          <ExternalLink
            href={links.release}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-panel py-1 pr-3 pl-1 text-xs text-dim transition-colors hover:border-dim"
          >
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono font-medium text-accent">
              v{KFLARE.version}
            </span>
            Released {KFLARE.released}
          </ExternalLink>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Cloudflare, managed from Kubernetes
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-dim">
            kflare is an open-source operator that manages Cloudflare through custom resources:
            zones, DNS records, tunnels, Workers and their storage, WAF rules and the Rules
            products.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-dim">
            Keep Cloudflare&apos;s configuration in git next to the workloads it serves, apply it
            with Helm, Argo CD or Flux like everything else, and kflare keeps Cloudflare matching
            it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#get-started">Get started</ButtonLink>
            <ButtonLink href={links.repo} variant="secondary" external>
              View on GitHub
            </ButtonLink>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            {facts.map(([term, detail]) => (
              <div key={term}>
                <dt className="text-faint">{term}</dt>
                <dd className="mt-1 font-medium">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ManifestWindow file="hello.yaml" manifest={HERO_MANIFEST} session={HERO_SESSION} />
      </Container>
    </div>
  );
}

function Highlights() {
  const items = [
    [`${KIND_COUNT} resource kinds`, 'DNS, tunnels, Workers, storage, the WAF and Rules'],
    ['Tested live', 'Every kind, against a real Cloudflare account'],
    ['Signed releases', 'cosign signatures, SBOMs and provenance'],
    ['GitOps-ready', 'Installs with Helm, Argo CD or Flux'],
  ] as const;
  return (
    <div className="border-t border-line bg-panel">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-6 py-8 lg:grid-cols-4">
          {items.map(([title, text]) => (
            <li key={title} className="flex gap-3">
              <Icon name="check" className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-dim">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

function Resources() {
  return (
    <Section
      id="resources"
      eyebrow="What it manages"
      title="One operator for the Cloudflare you already use"
      intro={
        <>
          {KIND_COUNT} kinds in <C>kflare.dev/v1alpha1</C>, across DNS, tunnels, Workers and their
          storage, security and the Rules products. Grant a token only the permissions of the kinds
          you use.
        </>
      }
    >
      <div className="gap-4 sm:columns-2 lg:columns-3">
        {AREAS.map(({ area, kinds }) => (
          <div
            key={area}
            className="mb-4 break-inside-avoid rounded-xl border border-line bg-panel p-5"
          >
            <h3 className="font-semibold">{area}</h3>
            <ul className="mt-4 space-y-3">
              {kinds.map(({ kind, does }) => (
                <li key={kind}>
                  <a
                    href={kindPath(kind)}
                    className="font-mono text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {kind}
                  </a>
                  <p className="mt-0.5 text-sm leading-relaxed text-dim">
                    <WithCode text={does} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Features() {
  return (
    <Section
      id="features"
      eyebrow="How it behaves"
      title="Built for platform teams"
      intro="kflare shares the Cloudflare account with the people and tools already using it, and runs like the rest of your cluster."
    >
      <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon, title, text }) => (
          <div key={title}>
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon name={icon} className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              <WithCode text={text} />
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Step({
  n,
  title,
  children,
  code,
}: {
  n: number;
  title: string;
  children: ReactNode;
  code?: ReactNode;
}) {
  return (
    <li className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div className="flex gap-4">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-panel font-mono text-sm font-medium text-accent"
          aria-hidden="true"
        >
          {n}
        </span>
        <div>
          <h3 className="pt-1 font-semibold">{title}</h3>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-dim">{children}</div>
        </div>
      </div>
      {code}
    </li>
  );
}

function GetStarted() {
  return (
    <Section
      id="get-started"
      eyebrow="Get started"
      title="A Service on the internet in four steps"
      intro={
        <>
          The quickstart puts a demo Service on <C>hello.your-domain.com</C> through a Cloudflare
          Tunnel, with no public IP, load balancer or open inbound port. You need a domain on your
          Cloudflare account.
        </>
      }
    >
      <ol className="space-y-12">
        <Step n={1} title="Create an API token">
          <p>
            In the Cloudflare dashboard, create a token with these permissions, the zone ones
            limited to your domain:
          </p>
          <ul className="space-y-1">
            {QUICKSTART.permissions.map((permission) => (
              <li key={permission} className="flex gap-2">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent" />
                {permission}
              </li>
            ))}
          </ul>
          <p>Note your account ID, shown on the account&apos;s overview page.</p>
        </Step>
        <Step
          n={2}
          title="Install kflare"
          code={<CodeBlock title="Install the chart" lang="sh" code={QUICKSTART.install} />}
        >
          <p>
            The Helm chart installs the CRDs and the controller, which runs under the restricted Pod
            Security Standard.
          </p>
        </Step>
        <Step
          n={3}
          title="Connect your account"
          code={<CodeBlock title="Point kflare at the token" lang="sh" code={QUICKSTART.account} />}
        >
          <p>
            The token goes in a Secret, and a cluster-scoped <C>CloudflareAccount</C> points at it.
            Every other resource refers to the account by name.
          </p>
        </Step>
        <Step
          n={4}
          title="Expose a Service"
          code={<CodeBlock title="Apply the example" lang="sh" code={QUICKSTART.expose} />}
        >
          <p>
            The example holds a demo app, a <C>Zone</C> that adopts your domain, a <C>Tunnel</C>,
            its <C>TunnelConfiguration</C>, a <C>DNSRecord</C> pointing <C>hello</C> at the tunnel,
            and the <C>cloudflared</C> Deployment that connects it.
          </p>
          <p>
            Deleting the namespace deletes the record and the tunnel, and keeps your zone, because
            kflare adopted it rather than creating it.
          </p>
        </Step>
      </ol>
      <p className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <ExternalLink href={links.quickstart} className={textLink}>
          The full quickstart
        </ExternalLink>
        <a href={DOCS.deploy} className={textLink}>
          Running kflare in production
        </a>
      </p>
    </Section>
  );
}

function Quality() {
  return (
    <Section
      id="quality"
      eyebrow="How it's built"
      title="Tested against the real Cloudflare API"
      intro="kflare is developed with AI assistance (Claude Code). This is what keeps it honest."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUALITY.map(({ title, text }) => (
          <div key={title} className="rounded-xl border border-line bg-panel p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              <WithCode text={text} />
            </p>
          </div>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a href={`${DOCS.architecture}#known-limitations`} className={textLink}>
          What was verified, and known limitations
        </a>
        <ExternalLink href={links.scorecard} className={textLink}>
          OpenSSF Scorecard
        </ExternalLink>
        <ExternalLink href={links.security} className={textLink}>
          Security policy
        </ExternalLink>
      </p>
    </Section>
  );
}

function RoadmapList({
  title,
  note,
  items,
  more,
}: {
  title: string;
  note: string;
  items: string[];
  more: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-faint">{note}</p>
      <ul className="mt-5 space-y-3 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span>
              <WithCode text={item} />
            </span>
          </li>
        ))}
      </ul>
      <ExternalLink href={more.href} className={`mt-6 inline-block text-sm ${textLink}`}>
        {more.label}
      </ExternalLink>
    </div>
  );
}

function Roadmap() {
  return (
    <Section
      id="roadmap"
      eyebrow="Roadmap"
      title="Where it's going"
      intro={
        <>
          kflare is in alpha: its API is <C>v1alpha1</C>, and fields can still change between
          releases. What people ask for decides the order of what comes next.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <RoadmapList
          title="In the next release"
          note="Merged since v0.4.1"
          items={NEXT_RELEASE}
          more={{ href: links.changelog, label: 'Changelog' }}
        />
        <RoadmapList
          title="Next"
          note="More of Cloudflare that a Free account can use and test"
          items={ROADMAP}
          more={{ href: links.roadmap, label: 'The full roadmap' }}
        />
      </div>
    </Section>
  );
}
