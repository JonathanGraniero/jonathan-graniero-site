import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CoverArt } from '../components/art/CoverArt.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Seo } from '../components/Seo.tsx';
import {
  ArrowLink,
  Badge,
  ButtonAnchor,
  Container,
  PageHeader,
  SectionHeading,
  Status,
} from '../components/ui.tsx';
import { KFLARE, KFLARE_KIND_COUNT } from '../lib/kflare.ts';

const { links } = KFLARE;

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-signal underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}

/** A titled paragraph in the two-column lists below. */
function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 font-serif text-base leading-relaxed text-dim">{children}</p>
    </div>
  );
}

/** Case study for kflare: what it manages, how it behaves, and how it's tested. */
export function KflarePage() {
  return (
    <Container className="py-14 sm:py-20">
      <Seo
        title="kflare"
        description="kflare: a Kubernetes operator that manages Cloudflare through custom resources. Zones, DNS, tunnels, Workers, KV, R2, D1, the WAF and the Rules products, installed with Helm."
      />
      <p className="text-xs text-faint">
        <Link to="/projects" className="hover:text-signal">
          ← projects
        </Link>
      </p>
      <div className="mt-6">
        <PageHeader command="kubectl describe operator kflare" title="kflare">
          A Kubernetes operator that manages Cloudflare through custom resources: zones, DNS
          records, tunnels, Workers and their storage, the WAF and the Rules products.
          Cloudflare&apos;s configuration lives in git next to the workloads it serves, goes through
          review and Argo CD or Flux like everything else, and kflare keeps Cloudflare matching it.
        </PageHeader>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonAnchor href={links.repo}>source ↗</ButtonAnchor>
        <ButtonAnchor href={links.quickstart} variant="secondary">
          quickstart ↗
        </ButtonAnchor>
        <ButtonAnchor href={links.artifactHub} variant="secondary">
          artifact hub ↗
        </ButtonAnchor>
      </div>

      <article className="mt-12 grid border border-line bg-panel md:grid-cols-[18rem_1fr]">
        <div className="aspect-[2/1] border-b border-line md:aspect-auto md:border-r md:border-b-0">
          <CoverArt seed="kflare" className="size-full" />
        </div>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2.5 p-5 text-xs sm:p-6">
          <dt className="text-faint">Status:</dt>
          <dd>
            <Status>Released</Status>{' '}
            <span className="text-dim">
              v{KFLARE.version} (alpha), {KFLARE.released}
            </span>
          </dd>
          <dt className="text-faint">API:</dt>
          <dd className="font-code">{KFLARE.apiVersion}</dd>
          <dt className="text-faint">Kinds:</dt>
          <dd>
            {KFLARE_KIND_COUNT} across {KFLARE.areas.length} areas
          </dd>
          <dt className="text-faint">Requires:</dt>
          <dd>{KFLARE.requires}</dd>
          <dt className="text-faint">Image:</dt>
          <dd className="flex flex-wrap gap-1">
            {KFLARE.platforms.map((p) => (
              <Badge key={p}>{p}</Badge>
            ))}
          </dd>
          <dt className="text-faint">Chart:</dt>
          <dd>
            <Ext href={links.artifactHub}>Artifact Hub</Ext>{' '}
            <span className="text-dim">(verified publisher)</span>
          </dd>
          <dt className="text-faint">Labels:</dt>
          <dd className="flex flex-wrap gap-1">
            {['Go', 'Kubernetes', 'controller-runtime', 'Cloudflare API', 'Helm'].map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </dd>
          <dt className="text-faint">License:</dt>
          <dd>{KFLARE.license}</dd>
          <dt className="text-faint">Started:</dt>
          <dd>{KFLARE.started}</dd>
        </dl>
      </article>

      <div className="mt-20 space-y-20">
        <section aria-labelledby="kflare-install">
          <SectionHeading command="helm install kflare">
            <span id="kflare-install">Install it, then describe Cloudflare in YAML</span>
          </SectionHeading>
          <div className="grid gap-x-8 lg:grid-cols-[1fr_22rem]">
            <div>
              <p className="font-serif text-lg leading-relaxed text-dim">
                The chart installs the CRDs and the controller. A cluster-scoped{' '}
                <code className="font-code text-sm text-ink">CloudflareAccount</code> points at an
                API token in a Secret, and every other resource refers to its parent by name instead
                of a copied ID. This record points a hostname at a Tunnel, and follows the tunnel if
                it&apos;s recreated with a new ID. The <Ext href={links.quickstart}>quickstart</Ext>{' '}
                puts a Service on the internet this way, with no public IP, load balancer or open
                inbound port.
              </p>
              <CodeBlock code={KFLARE.install} lang="bash" />
            </div>
            <CodeBlock code={KFLARE.example} lang="yaml" />
          </div>
        </section>

        <section aria-labelledby="kflare-kinds">
          <SectionHeading command="kubectl api-resources --api-group=kflare.dev">
            <span id="kflare-kinds">{KFLARE_KIND_COUNT} resource kinds</span>
          </SectionHeading>
          <div role="table" aria-label="kflare resource kinds" className="text-sm">
            <div
              role="row"
              className="hidden grid-cols-[14rem_1fr] gap-6 pb-2 text-[11px] text-faint md:grid"
            >
              <span role="columnheader">AREA</span>
              <span role="columnheader">KINDS</span>
            </div>
            {KFLARE.areas.map(({ area, kinds }) => (
              <div
                role="row"
                key={area}
                className="grid gap-2 border-t border-line py-3 md:grid-cols-[14rem_1fr] md:gap-6"
              >
                <span role="cell" className="font-semibold">
                  {area}
                </span>
                <span role="cell" className="flex flex-wrap gap-1">
                  {kinds.map((k) => (
                    <Badge key={k} className="font-code">
                      {k}
                    </Badge>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="kflare-behaviour">
          <SectionHeading command="kubectl explain --api-version=kflare.dev/v1alpha1">
            <span id="kflare-behaviour">How it behaves</span>
          </SectionHeading>
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            <Point title="It never takes over what it didn't create">
              Nobody starts with an empty Cloudflare account. An existing object is only adopted
              when the resource asks, with the{' '}
              <code className="font-code text-sm text-ink">kflare.dev/adoption-policy</code>{' '}
              annotation. Otherwise the resource reports{' '}
              <code className="font-code text-sm text-ink">AlreadyExists</code> and changes nothing.
            </Point>
            <Point title="Deletion is deliberate">
              Deleting a resource deletes what kflare created and keeps what it adopted.{' '}
              <code className="font-code text-sm text-ink">kflare.dev/deletion-policy</code> keeps
              or deletes any object explicitly. Resources can go in any order, a whole namespace
              included: parents wait for the resources that need them.
            </Point>
            <Point title="One Ready condition says why">
              Every resource reports a single{' '}
              <code className="font-code text-sm text-ink">Ready</code> condition with a reason, so{' '}
              <code className="font-code text-sm text-ink">kubectl describe</code> names the missing
              Secret or the refused permission. The controller serves Prometheus metrics.
            </Point>
            <Point title="Built for platform teams">
              Tokens stay in Secrets (External Secrets or Sealed Secrets work), and a rotated token
              is picked up straight away. Only cluster admins create accounts; the namespaced kinds
              join the built-in <code className="font-code text-sm text-ink">edit</code> role, so
              teams manage their own records and rules.
            </Point>
          </div>
        </section>

        <section aria-labelledby="kflare-testing">
          <SectionHeading command="make test-e2e">
            <span id="kflare-testing">How it&apos;s tested</span>
          </SectionHeading>
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            <Point title="Live end-to-end, every kind">
              A suite in GitHub Actions runs every resource kind against a real Cloudflare account
              on the Free plan, and checks Cloudflare&apos;s copy after each step. Its token holds
              only the permissions the deploy guide lists, so the documented token is known to be
              enough.
            </Point>
            <Point title="Mutation testing">
              Deliberate bugs are injected into the controllers, and the tests have to catch each
              one. A test that passes against broken code doesn&apos;t count.
            </Point>
            <Point title="Cloudflare checked before code relies on it">
              What the API accepts, refuses and stores is probed live first, and recorded in{' '}
              <Ext href={links.architecture}>ARCHITECTURE.md</Ext>. It accepts a CNAME to a tunnel
              that doesn&apos;t exist, for one.
            </Point>
            <Point title="Generated where it can be">
              kflare-gen generates {KFLARE.generated.length} of the {KFLARE_KIND_COUNT} kinds
              (types, controller and envtest specs) from Cloudflare&apos;s Go SDK and its OpenAPI
              spec, so new kinds share one tested reconcile loop.
            </Point>
          </div>
        </section>

        <section aria-labelledby="kflare-next">
          <SectionHeading
            command="kubectl get roadmap kflare"
            action={<ArrowLink to={KFLARE.post}>the first post</ArrowLink>}
          >
            <span id="kflare-next">Where it&apos;s going</span>
          </SectionHeading>
          <p className="max-w-3xl font-serif text-lg leading-relaxed text-dim">
            It started in March as three kinds and a{' '}
            <Link to={KFLARE.post} className="text-signal underline-offset-4 hover:underline">
              weekend&apos;s notes
            </Link>
            . Next are drift correction on a schedule (today a dashboard change is corrected on the
            next reconcile, up to 10 hours later), Kubernetes Events, and more kinds a Free account
            can test: zone settings, Queues, Turnstile and Workers custom domains. The{' '}
            <Ext href={links.roadmap}>roadmap</Ext> has the list, and{' '}
            <Ext href={links.discussions}>Discussions</Ext> is open for questions and feedback.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {(
              [
                ['deploy guide', links.deploy],
                ['architecture', links.architecture],
                ['release notes', links.release],
                ['issues', links.issues],
              ] as const
            ).map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dim hover:text-signal"
                >
                  {label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
