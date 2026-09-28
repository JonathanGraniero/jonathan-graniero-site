import { useQueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@site/shared';
import { Link } from 'react-router';
import { formatDate } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { TagLink } from './TagLink.tsx';

export function PostCard({ post }: { post: PostSummary }) {
  const queryClient = useQueryClient();
  // Warm the cache on intent so the post page renders instantly.
  const prefetch = () =>
    void queryClient.prefetchQuery({ ...queries.post(post.slug), staleTime: 30_000 });

  return (
    <article className="group relative flex flex-col gap-2 rounded-xl p-4 -mx-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        {post.publishedAt && (
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        )}
        <span aria-hidden>·</span>
        <span>{post.readingTimeMin} min read</span>
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        <Link
          to={`/blog/${post.slug}`}
          onMouseEnter={prefetch}
          onFocus={prefetch}
          className="after:absolute after:inset-0 after:content-[''] group-hover:text-accent-700 dark:group-hover:text-accent-400"
        >
          {post.title}
        </Link>
      </h3>
      <p className="text-zinc-600 dark:text-zinc-400">{post.excerpt}</p>
      {post.tags.length > 0 && (
        <ul className="relative z-10 mt-1 flex flex-wrap gap-2" aria-label="Tags">
          {post.tags.map((t) => (
            <li key={t.slug}>
              <TagLink tag={t} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-4" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
