import type { ReactNode } from 'react';
import { CodeBlock } from '../components/Code.tsx';
import { ExternalLink, WithCode } from '../components/ui.tsx';
import { Breadcrumb } from './DocsLayout.tsx';
import { FieldTable } from './FieldTable.tsx';
import { KINDS, kindPath, type KindDoc } from './reference.ts';

const textLink = 'font-medium text-accent underline-offset-4 hover:underline';

function Part({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-20">
      <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {intro && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** One kind's reference, built from its CRD and samples. */
export function KindPage({ doc }: { doc: KindDoc }) {
  const at = KINDS.indexOf(doc);
  const [prev, next] = [KINDS[at - 1], KINDS[at + 1]];
  const parts = [
    ['example', 'Example'],
    ['spec', 'Spec'],
    ...(doc.rules.length ? [['rules', 'Rules']] : []),
    ['status', 'Status'],
    ['columns', 'kubectl get'],
    ['samples', 'Samples'],
  ];
  const facts = [
    ['API version', doc.apiVersion],
    ['Scope', doc.scope],
    ['Short name', doc.shortNames.join(', ') || '—'],
    ['Token permission', doc.permission ?? '—'],
  ];
  return (
    <article>
      <Breadcrumb trail={['Reference', doc.area]} />
      <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
        {doc.kind}
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-dim">
        <WithCode text={doc.summary} />
      </p>
      <dl className="mt-8 grid max-w-3xl gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        {facts.map(([term, detail]) => (
          <div key={term}>
            <dt className="text-faint">{term}</dt>
            <dd className="mt-0.5 font-mono text-[13px]">{detail}</dd>
          </div>
        ))}
      </dl>
      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {parts.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={textLink}>
            {label}
          </a>
        ))}
      </nav>

      <Part
        id="example"
        title="Example"
        intro={
          <>
            Every field, with the sample&apos;s values. The live lines are{' '}
            <a href="#samples" className={textLink}>
              the repository&apos;s sample
            </a>
            , which applies as it is; the commented ones are the other fields, filled from other
            samples where one sets them. Some exclude each other, so check the rules before you
            uncomment several.
          </>
        }
      >
        <CodeBlock code={doc.example} lang="yaml" title={`${doc.slug}.yaml`} />
      </Part>

      <Part id="spec" title="Spec" intro="What you set, with the limits the API server enforces.">
        <FieldTable prefix="spec" fields={doc.spec} />
      </Part>

      {doc.rules.length > 0 && (
        <Part id="rules" title="Rules" intro="Checked across fields when the resource is applied.">
          <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-dim">
            {doc.rules.map((rule) => (
              <li key={rule}>
                <WithCode text={rule} />
              </li>
            ))}
          </ul>
        </Part>
      )}

      <Part
        id="status"
        title="Status"
        intro={
          <>
            What kflare reports. <code className="font-mono text-ink">conditions</code> holds the{' '}
            <code className="font-mono text-ink">Ready</code> condition, whose reason says why a
            resource isn&apos;t ready.
          </>
        }
      >
        <FieldTable prefix="status" fields={doc.status} />
      </Part>

      <Part
        id="columns"
        title="kubectl get"
        intro={
          <>
            The columns <code className="font-mono text-ink">kubectl get {doc.plural}</code> prints.
          </>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-faint">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Column
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {doc.columns.map((c) => (
                <tr key={c.name} className="border-t border-line first:border-t-0">
                  <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-ink">
                    {c.name.toUpperCase()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[13px] text-dim">{c.jsonPath}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Part>

      <Part
        id="samples"
        title="Samples"
        intro="From the repository's config/samples, comments included."
      >
        <div className="space-y-6">
          {doc.samples.map((s) => (
            <div key={s.file}>
              <CodeBlock code={s.text} lang="yaml" title={s.file} />
              <p className="mt-2 text-xs">
                <ExternalLink href={s.url} className="text-faint hover:text-accent">
                  On GitHub
                </ExternalLink>
              </p>
            </div>
          ))}
        </div>
      </Part>

      <nav
        aria-label="Other kinds"
        className="mt-16 flex justify-between gap-4 border-t border-line pt-6 text-sm"
      >
        {prev ? (
          <a href={kindPath(prev.kind)} className="text-dim hover:text-accent">
            ← <span className="font-mono">{prev.kind}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={kindPath(next.kind)} className="text-right text-dim hover:text-accent">
            <span className="font-mono">{next.kind}</span> →
          </a>
        )}
      </nav>
    </article>
  );
}
