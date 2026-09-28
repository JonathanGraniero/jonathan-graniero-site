import clsx from 'clsx';
import type { Tag } from '@site/shared';
import { Link } from 'react-router';

export function TagLink({ tag, active, count }: { tag: Tag; active?: boolean; count?: number }) {
  return (
    <Link
      to={active ? '/blog' : `/blog?tag=${tag.slug}`}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium transition',
        active
          ? 'border-accent-600 bg-accent-600 text-white dark:border-accent-500 dark:bg-accent-500 dark:text-zinc-950'
          : 'border-zinc-200 text-zinc-600 hover:border-accent-500 hover:text-accent-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-accent-400 dark:hover:text-accent-400',
      )}
    >
      #{tag.name}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </Link>
  );
}
