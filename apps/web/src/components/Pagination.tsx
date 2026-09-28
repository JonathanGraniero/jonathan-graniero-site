import clsx from 'clsx';
import { pageWindow } from '../lib/pagination.ts';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const item =
    'min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      <button
        className={clsx(item, 'hover:bg-zinc-100 dark:hover:bg-zinc-800')}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ← Prev
      </button>
      {pageWindow(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-zinc-400">
            …
          </span>
        ) : (
          <button
            key={p}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
            className={clsx(
              item,
              p === page
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={clsx(item, 'hover:bg-zinc-100 dark:hover:bg-zinc-800')}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}
