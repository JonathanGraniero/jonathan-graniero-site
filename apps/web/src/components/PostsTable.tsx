import { useQueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@site/shared';
import { Link } from 'react-router';
import { age, formatDate } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { TagLink } from './TagLink.tsx';

/**
 * Posts rendered as `kubectl get posts` output: one row per post with
 * NAME / LABELS / READ / AGE columns. Collapses to stacked rows on phones.
 */
export function PostsTable({
  posts,
  showExcerpt = true,
}: {
  posts: PostSummary[];
  showExcerpt?: boolean;
}) {
  const queryClient = useQueryClient();
  const prefetch = (slug: string) =>
    void queryClient.prefetchQuery({ ...queries.post(slug), staleTime: 30_000 });

  return (
    <div role="table" aria-label="Posts" className="text-sm">
      <div
        role="row"
        className="hidden grid-cols-[1fr_14rem_4rem_4rem] gap-6 pb-2 text-[11px] text-faint md:grid"
      >
        <span role="columnheader">NAME</span>
        <span role="columnheader">LABELS</span>
        <span role="columnheader">READ</span>
        <span role="columnheader" className="text-right">
          AGE
        </span>
      </div>
      {posts.map((post) => (
        <div
          role="row"
          key={post.id}
          className="group relative grid gap-2 border-t border-line py-4 transition hover:bg-panel md:grid-cols-[1fr_14rem_4rem_4rem] md:gap-6 md:px-2 md:-mx-2"
        >
          <div role="cell" className="min-w-0">
            <Link
              to={`/blog/${post.slug}`}
              onMouseEnter={() => prefetch(post.slug)}
              onFocus={() => prefetch(post.slug)}
              className="font-semibold text-ink transition after:absolute after:inset-0 group-hover:text-signal"
            >
              {post.title}
            </Link>
            {showExcerpt && (
              <p className="mt-1.5 line-clamp-2 font-serif text-[15px] leading-snug text-dim">
                {post.excerpt}
              </p>
            )}
          </div>
          <div role="cell" className="relative z-10 flex flex-wrap content-start gap-1">
            {post.tags.map((t) => (
              <TagLink key={t.slug} tag={t} />
            ))}
          </div>
          <div role="cell" className="text-xs text-dim md:pt-0.5">
            {post.readingTimeMin}m
          </div>
          <div role="cell" className="text-xs text-dim md:pt-0.5 md:text-right">
            {post.publishedAt ? (
              <time dateTime={post.publishedAt} title={formatDate(post.publishedAt)}>
                {age(post.publishedAt)}
              </time>
            ) : (
              <span className="text-warn">draft</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PostsTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 border-t border-line py-4">
          <div className="h-4 w-2/3 animate-pulse bg-line/50" />
          <div className="h-3 w-1/2 animate-pulse bg-line/40" />
        </div>
      ))}
    </div>
  );
}
