import clsx from 'clsx';
import type { Tag } from '@site/shared';
import { Link } from 'react-router';

export function TagLink({ tag, active, count }: { tag: Tag; active?: boolean; count?: number }) {
  return (
    <Link
      to={active ? '/blog' : `/blog?tag=${tag.slug}`}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium transition',
        active
          ? 'border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
          : 'border-zinc-200 bg-white/60 text-zinc-600 hover:border-accent-500/60 hover:text-accent-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:border-accent-400/50 dark:hover:text-accent-300',
      )}
    >
      #{tag.name}
      {count !== undefined && <span className="opacity-50">{count}</span>}
    </Link>
  );
}
