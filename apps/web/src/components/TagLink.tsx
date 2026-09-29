import clsx from 'clsx';
import type { Tag } from '@site/shared';
import { Link } from 'react-router';

/** A tag rendered as a label selector (`tag=go`); links to the filtered blog. */
export function TagLink({ tag, active, count }: { tag: Tag; active?: boolean; count?: number }) {
  return (
    <Link
      to={active ? '/blog' : `/blog?tag=${tag.slug}`}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] transition',
        active
          ? 'border-signal bg-signal text-signal-ink'
          : 'border-line text-dim hover:border-signal hover:text-signal',
      )}
    >
      <span className={active ? 'opacity-70' : 'text-faint'}>tag=</span>
      {tag.slug}
      {count !== undefined && <span className="opacity-60">({count})</span>}
    </Link>
  );
}
