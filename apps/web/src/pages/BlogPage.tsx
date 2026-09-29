import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { Pagination } from '../components/Pagination.tsx';
import { PostsTable, PostsTableSkeleton } from '../components/PostsTable.tsx';
import { Seo } from '../components/Seo.tsx';
import { TagLink } from '../components/TagLink.tsx';
import { Container, EmptyState, ErrorState, Kbd, PageHeader } from '../components/ui.tsx';
import { useDebouncedValue } from '../lib/hooks.ts';
import { FOCUS_SEARCH_EVENT } from '../lib/hotkeys.ts';
import { queries } from '../lib/queries.ts';

const PAGE_SIZE = 10;

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

  // `/` focuses search: via an event when already here, or router state on arrival.
  const searchRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  useEffect(() => {
    const focus = () => searchRef.current?.focus();
    if ((location.state as { focusSearch?: boolean } | null)?.focusSearch) focus();
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
  }, [location.state]);

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
    <Container className="py-14 sm:py-20">
      <Seo
        title="Blog"
        description="Notes on software engineering, infrastructure and building things."
      />
      <PageHeader command="kubectl get posts" title="Writing">
        Notes on Kubernetes, AWS and backend systems, and what I&apos;ve learned building them.
      </PageHeader>

      {/* The filter bar reads as the command that produces the list below. */}
      <div className="mt-10 border border-line bg-panel">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 text-sm">
          <span className="text-signal">$</span>
          <span className="text-dim">kubectl get posts</span>
          {activeTag && (
            <Link
              to="/blog"
              className="border border-signal px-1.5 py-0.5 text-xs text-signal hover:bg-signal hover:text-signal-ink"
              aria-label={`Clear tag filter ${activeTag.slug}`}
            >
              -l tag={activeTag.slug} ×
            </Link>
          )}
          <span className="text-dim">| grep -i</span>
          <label className="flex min-w-40 flex-1 items-center">
            <span className="sr-only">Search posts</span>
            <input
              ref={searchRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="search…"
              className="w-full border-b border-dashed border-line bg-transparent py-0.5 text-sm text-ink placeholder:text-faint focus:border-signal focus:outline-none"
            />
          </label>
          <span className="hidden sm:inline">
            <Kbd>/</Kbd>
          </span>
        </div>
        {tags.data && tags.data.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-3">
            <span className="mr-1 text-[11px] text-faint">labels:</span>
            <ul className="flex flex-wrap gap-1.5" aria-label="Filter by tag">
              {tags.data.map((t) => (
                <li key={t.slug}>
                  <TagLink tag={t} count={t.postCount} active={t.slug === tag} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8" aria-live="polite" aria-busy={posts.isFetching}>
        {posts.data && posts.data.items.length > 0 && (
          <p className="mb-3 text-[11px] text-faint">
            {posts.data.total} {posts.data.total === 1 ? 'resource' : 'resources'}
            {activeTag && <> with label tag={activeTag.slug}</>}
            {q && <> matching &ldquo;{q}&rdquo;</>}
          </p>
        )}
        {posts.isPending ? (
          <PostsTableSkeleton rows={4} />
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        ) : posts.data.items.length === 0 ? (
          <EmptyState title="No posts found">
            Try a different search or clear the label filter.
          </EmptyState>
        ) : (
          <div
            className={
              posts.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'
            }
          >
            <PostsTable posts={posts.data.items} />
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
