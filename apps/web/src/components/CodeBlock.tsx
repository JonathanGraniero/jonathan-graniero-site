import { useEffect, useState } from 'react';
import { highlight } from '../lib/highlighter.ts';

interface CodeBlockProps {
  code: string;
  lang: string | undefined;
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    highlight(code, lang)
      .then((out) => !cancelled && setHtml(out))
      .catch(() => {
        /* fall back to the plain block */
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="group relative not-prose my-6">
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-zinc-200 bg-zinc-50 px-4 py-1.5 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <span>{lang ?? 'text'}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded px-2 py-0.5 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Copy code to clipboard"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {html ? (
        <div
          className="overflow-x-auto rounded-b-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-950 [&_pre]:!bg-transparent"
          // Shiki escapes the source; the output is safe to inject.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto rounded-b-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed dark:border-zinc-800 dark:bg-zinc-950">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
