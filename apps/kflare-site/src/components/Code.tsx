import { Fragment, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'yaml' | 'sh' | 'console' | 'text';

const YAML_KEY = /^(\s*(?:- )?)([\w./-]+)(:)(.*)$/;

/**
 * Just enough highlighting for the site's snippets: YAML keys and values,
 * comments, and the prompt and output of a console session.
 */
function highlight(line: string, lang: Lang): ReactNode {
  if (lang === 'text') return line;
  if (lang === 'console') {
    return line.startsWith('$ ') ? (
      <>
        <span className="text-code-dim select-none">$ </span>
        {line.slice(2)}
      </>
    ) : (
      <span className={line.endsWith('condition met') ? 'text-code-ok' : 'text-code-dim'}>
        {line}
      </span>
    );
  }
  if (/^\s*#/.test(line) || line === '---') {
    return <span className="text-code-dim">{line}</span>;
  }
  // Shell snippets get it too, for the YAML in their heredocs.
  const match = YAML_KEY.exec(line);
  if (!match) return line;
  const [, indent, key, colon, value] = match;
  return (
    <>
      {indent}
      <span className="text-code-key">{key}</span>
      {colon}
      <span className="text-code-value">{value}</span>
    </>
  );
}

function Lines({ code, lang }: { code: string; lang: Lang }) {
  return code.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && '\n'}
      {highlight(line, lang)}
    </Fragment>
  ));
}

/**
 * Pages React hydrates use its onClick; the docs pages, which it doesn't, find
 * the button by data-copy instead (components/copy.ts).
 */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    // Undefined outside a secure context; the code can still be selected by hand.
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => {},
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        data-copy
        className="rounded-md px-2 py-1 text-code-dim transition-colors hover:bg-code-line hover:text-code-ink"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" className="sr-only" data-copy-status>
        {copied ? 'Copied to the clipboard' : ''}
      </span>
    </>
  );
}

/** A titled, dark code panel with a copy button. */
export function CodeBlock({ code, lang, title }: { code: string; lang: Lang; title: string }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-code-line bg-code shadow-sm">
      <figcaption className="flex items-center justify-between gap-4 border-b border-code-line py-1.5 pr-2 pl-4 font-mono text-xs text-code-dim">
        <span>{title}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-code-ink">
        <code>
          <Lines code={code} lang={lang} />
        </code>
      </pre>
    </figure>
  );
}

/** The hero's window: a manifest above the session that applies it. */
export function ManifestWindow({
  file,
  manifest,
  session,
}: {
  file: string;
  manifest: string;
  session: string;
}) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-2xl border border-code-line bg-code shadow-2xl shadow-black/20">
      <figcaption className="flex items-center gap-3 border-b border-code-line px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-2.5 rounded-full bg-code-line" />
          ))}
        </span>
        <span className="font-mono text-xs text-code-dim">{file}</span>
      </figcaption>
      <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-code-ink">
        <code>
          <Lines code={manifest} lang="yaml" />
        </code>
      </pre>
      <pre className="overflow-x-auto border-t border-code-line p-5 font-mono text-[12.5px] leading-relaxed text-code-ink">
        <code>
          <Lines code={session} lang="console" />
        </code>
      </pre>
    </figure>
  );
}
