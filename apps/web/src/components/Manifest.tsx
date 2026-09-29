import type { ReactNode } from 'react';

/**
 * Minimal building blocks for rendering YAML-looking markup with real,
 * interactive content (links) inside it. Indentation is by nesting level.
 */
export function YamlBlock({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <figure className="border border-line bg-panel">
      {title && (
        <figcaption className="flex items-center justify-between border-b border-line px-4 py-2 text-[11px] text-faint">
          <span>{title}</span>
          <span aria-hidden>yaml</span>
        </figcaption>
      )}
      <div className="overflow-x-auto px-4 py-4 font-code text-[13px] leading-6">{children}</div>
    </figure>
  );
}

export function Line({ level = 0, children }: { level?: number; children: ReactNode }) {
  return (
    <div className="whitespace-pre" style={{ paddingLeft: `${level * 2}ch` }}>
      {children}
    </div>
  );
}

/** `key:` */
export const K = ({ children }: { children: ReactNode }) => (
  <>
    <span className="text-key">{children}</span>
    <span className="text-faint">:</span>{' '}
  </>
);

/** A scalar value. `str` wraps it in quotes like YAML strings. */
export const V = ({ children, str }: { children: ReactNode; str?: boolean }) => (
  <span className="text-ink">
    {str && <span className="text-faint">&quot;</span>}
    {children}
    {str && <span className="text-faint">&quot;</span>}
  </span>
);

/** Inline flow sequence: `[a, b, c]`. */
export const Seq = ({ items }: { items: readonly string[] }) => (
  <span>
    <span className="text-faint">[</span>
    {items.map((it, i) => (
      <span key={it}>
        <span className="text-ink">{it}</span>
        {i < items.length - 1 && <span className="text-faint">, </span>}
      </span>
    ))}
    <span className="text-faint">]</span>
  </span>
);

export const Dash = () => <span className="text-faint">- </span>;

export const Comment = ({ children }: { children: ReactNode }) => (
  <span className="text-faint"># {children}</span>
);
