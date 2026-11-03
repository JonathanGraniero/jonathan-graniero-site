import { WithCode } from '../components/ui.tsx';
import { ANNOTATIONS, AREAS, KFLARE } from '../content.ts';
import { GUIDES } from './links.ts';
import { SOURCE, kindPath } from './reference.ts';

const START = [
  {
    href: '/#get-started',
    title: 'Quickstart',
    text: 'Put a Service on the internet through a Cloudflare Tunnel, in four steps.',
  },
  {
    href: GUIDES.deploy.path,
    title: 'Deploying kflare',
    text: 'Install with Helm, Argo CD or Flux, the token, configuration, monitoring, upgrades.',
  },
  {
    href: GUIDES.architecture.path,
    title: 'Architecture',
    text: 'How kflare finds, owns, corrects and deletes Cloudflare objects, and its limits.',
  },
];

function Heading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-20 text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

/** /docs/: where to start, every kind, and the annotations they share. */
export function DocsIndex() {
  return (
    <article>
      <p className="font-mono text-xs font-medium tracking-wider text-accent uppercase">
        Documentation
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        kflare documentation
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-dim">
        For kflare {SOURCE.tag}, released {KFLARE.released}. The reference is built from that
        release&apos;s CRDs and samples, and the guides from its repository, so every field and rule
        here is one the API server knows.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {START.map(({ href, title, text }) => (
          <li key={href}>
            <a
              href={href}
              className="block h-full rounded-xl border border-line bg-panel p-5 transition-colors hover:border-dim"
            >
              <span className="block font-semibold">{title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-dim">{text}</span>
            </a>
          </li>
        ))}
      </ul>

      <Heading id="reference">Resource reference</Heading>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">
        Each page has an example with every field, the field reference, the rules the API server
        checks, what the resource reports in its status, and the repository&apos;s samples.
      </p>
      <div className="mt-6 space-y-8">
        {AREAS.map(({ area, kinds }) => (
          <section key={area} aria-label={area}>
            <h3 className="text-sm font-semibold">{area}</h3>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-panel">
              {kinds.map(({ kind, does, permission }) => (
                <li key={kind}>
                  <a
                    href={kindPath(kind)}
                    className="grid gap-1 px-4 py-3 transition-colors hover:bg-accent-soft sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4"
                  >
                    <code className="font-mono text-sm font-medium text-accent">{kind}</code>
                    <span className="text-sm text-dim">
                      <WithCode text={does} />
                      {permission && (
                        <span className="mt-0.5 block text-xs text-faint">Token: {permission}</span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Heading id="annotations">Annotations</Heading>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">
        Every kind reads these. kflare sets{' '}
        <code className="font-mono text-ink">kflare.dev/adopted</code> itself, to{' '}
        <code className="font-mono text-ink">&quot;true&quot;</code>, on a resource that adopted its
        Cloudflare object.
      </p>
      <div className="mt-6 rounded-xl border border-line bg-panel sm:overflow-x-auto">
        <table className="w-full text-left text-sm max-sm:block sm:min-w-[36rem]">
          <thead className="border-b border-line text-xs text-faint max-sm:hidden">
            <tr>
              <th scope="col" className="w-[38%] px-4 py-2.5 font-medium">
                Annotation
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                What it does
              </th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {ANNOTATIONS.map(({ name, values, text }) => (
              <tr
                key={name}
                className="border-t border-line align-top first:border-t-0 max-sm:block"
              >
                <td className="px-4 pt-3 max-sm:block sm:pb-3">
                  <code className="font-mono text-[13px] font-medium wrap-anywhere text-ink">
                    {name}
                  </code>
                  <p className="mt-1 font-mono text-xs text-faint">{values.join(' | ')}</p>
                </td>
                <td className="px-4 pt-2 pb-3 leading-relaxed wrap-anywhere text-dim max-sm:block sm:pt-3">
                  <WithCode text={text} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
