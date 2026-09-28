import { useQueryClient } from '@tanstack/react-query';
import type { PostSummary } from '@site/shared';
import clsx from 'clsx';
import { Link } from 'react-router';
import { formatDate } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';
import { CoverArt } from './art/CoverArt.tsx';
import { TagLink } from './TagLink.tsx';

interface PostCardProps {
  post: PostSummary;
  /** `tile`: cover on top (grids). `row`: thumbnail beside the text (lists). */
  layout?: 'tile' | 'row';
}

export function PostCard({ post, layout = 'row' }: PostCardProps) {
  const queryClient = useQueryClient();
  // Warm the cache on intent so the post page renders instantly.
  const prefetch = () =>
    void queryClient.prefetchQuery({ ...queries.post(post.slug), staleTime: 30_000 });
  const tile = layout === 'tile';

  return (
    <article
      className={clsx(
        'glass-interactive group relative flex overflow-hidden',
        tile ? 'h-full flex-col' : 'flex-col sm:flex-row sm:items-stretch',
      )}
    >
      <div
        className={clsx(
          'relative shrink-0 overflow-hidden',
          tile ? 'aspect-[2/1]' : 'aspect-[2/1] sm:aspect-auto sm:w-56 md:w-64',
        )}
      >
        {post.coverImage ? (
          <img src={post.coverImage} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <CoverArt
            seed={post.slug}
            className="size-full transition duration-700 group-hover:scale-[1.04]"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-6">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 dark:text-zinc-500">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          )}
          <span aria-hidden>·</span>
          <span>{post.readingTimeMin} min read</span>
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-zinc-900 dark:text-white">
          <Link
            to={`/blog/${post.slug}`}
            onMouseEnter={prefetch}
            onFocus={prefetch}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </h3>
        <p
          className={clsx(
            'text-sm leading-relaxed text-zinc-600 dark:text-zinc-400',
            tile && 'line-clamp-3',
          )}
        >
          {post.excerpt}
        </p>
        {post.tags.length > 0 && (
          <ul className="relative z-10 mt-auto flex flex-wrap gap-1.5 pt-2" aria-label="Tags">
            {post.tags.map((t) => (
              <li key={t.slug}>
                <TagLink tag={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function PostCardSkeleton({ layout = 'row' }: { layout?: 'tile' | 'row' }) {
  return (
    <div
      aria-hidden
      className={clsx(
        'glass flex overflow-hidden',
        layout === 'tile' ? 'flex-col' : 'flex-col sm:flex-row',
      )}
    >
      <div
        className={clsx(
          'animate-pulse bg-zinc-200/70 dark:bg-white/[0.06]',
          layout === 'tile' ? 'aspect-[2/1]' : 'aspect-[2/1] sm:aspect-auto sm:h-40 sm:w-64',
        )}
      />
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="h-3 w-32 animate-pulse rounded bg-zinc-200/70 dark:bg-white/[0.06]" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-200/70 dark:bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-200/70 dark:bg-white/[0.06]" />
      </div>
    </div>
  );
}
