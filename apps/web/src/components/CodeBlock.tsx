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
      <div className="flex items-center justify-between border border-b-0 border-line bg-panel px-4 py-1.5 font-sans text-[11px] text-faint">
        <span>{lang ?? 'text'}</span>
        <button
          type="button"
          onClick={copy}
          className="px-2 py-0.5 transition hover:text-signal"
          aria-label="Copy code to clipboard"
        >
          {copied ? 'copied ✓' : 'copy'}
        </button>
      </div>
      {html ? (
        <div
          className="overflow-x-auto border border-line bg-bg p-4 font-code text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:!font-code"
          // Shiki escapes the source; the output is safe to inject.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto border border-line bg-bg p-4 font-code text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
