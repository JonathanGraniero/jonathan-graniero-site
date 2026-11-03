import type { ReactNode } from 'react';
import { stringify } from 'yaml';
import { WithCode } from '../components/ui.tsx';
import type { Field } from './schema.ts';

// Tailwind only sees whole class names, so the nesting steps are spelled out.
const INDENT = ['pl-0', 'pl-4', 'pl-8', 'pl-12', 'pl-16', 'pl-20'];

/**
 * The anchor of a field's row: spec.zoneRef.name. The dots keep it clear of
 * the page's other ids, such as the Spec heading's spec-title when a kind has
 * a field called title.
 */
const fieldId = (prefix: string, path: string) =>
  `${prefix}.${path.replace(/\[\]/g, '').replace(/[^\w.-]+/g, '-')}`;

function Badge({ tone = 'plain', children }: { tone?: 'plain' | 'strong'; children: ReactNode }) {
  const style = tone === 'strong' ? 'border-accent/40 text-accent' : 'border-line text-faint';
  return (
    <span className={`rounded border px-1.5 py-px font-mono text-[11px] ${style}`}>{children}</span>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="mt-1.5 text-xs text-faint">
      <span className="font-medium text-dim">{label}:</span> {children}
    </p>
  );
}

const inline = (value: unknown) => stringify(value, { version: '1.1' }).trim();

/** Every field under spec or status, with its type, rules and description. */
export function FieldTable({ prefix, fields }: { prefix: string; fields: Field[] }) {
  return (
    <div className="rounded-xl border border-line bg-panel sm:overflow-x-auto">
      <table className="w-full text-left text-sm max-sm:block sm:min-w-[36rem]">
        <thead className="border-b border-line text-xs text-faint max-sm:hidden">
          <tr>
            <th scope="col" className="w-[38%] px-4 py-2.5 font-medium">
              Field
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="max-sm:block">
          {fields.map((f) => {
            const dot = f.path.lastIndexOf('.');
            return (
              <tr
                key={f.path}
                id={fieldId(prefix, f.path)}
                className="scroll-mt-20 border-t border-line align-top first:border-t-0 target:bg-accent-soft max-sm:block"
              >
                <td className="px-4 pt-3 max-sm:block sm:pb-3">
                  <div className={INDENT[Math.min(f.depth, INDENT.length - 1)]}>
                    <code className="font-mono text-[13px] wrap-anywhere">
                      <span className="text-faint">{f.path.slice(0, dot + 1)}</span>
                      <span className="font-medium text-ink">{f.path.slice(dot + 1)}</span>
                    </code>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge>{f.type}</Badge>
                      {f.required && <Badge tone="strong">required</Badge>}
                      {f.immutable && <Badge>immutable</Badge>}
                    </div>
                  </div>
                </td>
                <td className="px-4 pt-2 pb-3 leading-relaxed wrap-anywhere text-dim max-sm:block sm:pt-3">
                  {f.description.split('\n\n').map((p, i) => (
                    <p key={i} className={i ? 'mt-2' : undefined}>
                      <WithCode text={p} />
                    </p>
                  ))}
                  {f.default !== undefined && (
                    <Detail label="Default">
                      <code className="font-mono text-ink">{inline(f.default)}</code>
                    </Detail>
                  )}
                  {f.values && (
                    <Detail label="One of">
                      {f.values.map((v, i) => (
                        <span key={v}>
                          {i > 0 && ', '}
                          <code className="font-mono text-ink">{v}</code>
                        </span>
                      ))}
                    </Detail>
                  )}
                  {f.limits.length > 0 && (
                    <Detail label="Limits">
                      <WithCode text={f.limits.join('; ')} />
                    </Detail>
                  )}
                  {f.rules.map((rule) => (
                    <Detail key={rule} label="Rule">
                      <WithCode text={rule} />
                    </Detail>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
