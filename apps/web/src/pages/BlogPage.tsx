import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Pagination } from '../components/Pagination.tsx';
import { PostCard, PostCardSkeleton } from '../components/PostCard.tsx';
import { Seo } from '../components/Seo.tsx';
import { TagLink } from '../components/TagLink.tsx';
import { Container, EmptyState, ErrorState } from '../components/ui.tsx';
import { useDebouncedValue } from '../lib/hooks.ts';
import { queries } from '../lib/queries.ts';

const PAGE_SIZE = 5;

/** All list state lives in the URL, so filtered views are shareable and back/forward works. */
export function BlogPage() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') ?? undefined;
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);

  // When the URL changes from outside the input (back button, tag links),
  // mirror it — unless it's just our own debounced write of the same text.
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    if (q !== searchInput.trim()) setSearchInput(q);
  }

  useEffect(() => {
    if (debouncedSearch === q) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedSearch) next.set('q', debouncedSearch);
        else next.delete('q');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const posts = useQuery(queries.posts({ page, pageSize: PAGE_SIZE, tag, q: q || undefined }));
  const tags = useQuery(queries.tags());
  const activeTag = tags.data?.find((t) => t.slug === tag);

  const goToPage = (p: number) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p));
      else next.delete('page');
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container className="py-14">
      <Seo
        title="Blog"
        description="Notes on software engineering, infrastructure and building things."
      />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Blog
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Notes on software engineering, infrastructure, and things I&apos;ve learned building them.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <label className="relative block max-w-md">
          <span className="sr-only">Search posts</span>
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts…"
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-zinc-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {tags.data && tags.data.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Filter by tag">
            {tags.data.map((t) => (
              <li key={t.slug}>
                <TagLink tag={t} count={t.postCount} active={t.slug === tag} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10" aria-live="polite" aria-busy={posts.isFetching}>
        {(tag || q) && posts.data && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {posts.data.total} {posts.data.total === 1 ? 'post' : 'posts'}
            {activeTag && (
              <>
                {' '}
                tagged{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">#{activeTag.name}</strong>
              </>
            )}
            {q && (
              <>
                {' '}
                matching{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">&ldquo;{q}&rdquo;</strong>
              </>
            )}
          </p>
        )}
        {posts.isPending ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        ) : posts.data.items.length === 0 ? (
          <EmptyState title="No posts found">
            Try a different search or clear the tag filter.
          </EmptyState>
        ) : (
          <div
            className={
              posts.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'
            }
          >
            <div className="flex flex-col gap-4">
              {posts.data.items.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
            <Pagination
              page={posts.data.page}
              totalPages={posts.data.totalPages}
              onChange={goToPage}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
