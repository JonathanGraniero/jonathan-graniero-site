import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Markdown } from '../components/Markdown.tsx';
import { Seo } from '../components/Seo.tsx';
import { TagLink } from '../components/TagLink.tsx';
import { Container, ErrorState, Skeleton } from '../components/ui.tsx';
import { ApiError } from '../lib/api.ts';
import { formatDate } from '../lib/format.ts';
import { useActiveHeading } from '../lib/hooks.ts';
import { queries } from '../lib/queries.ts';
import { extractToc } from '../lib/toc.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

export function PostPage() {
  const { slug = '' } = useParams();
  const post = useQuery(queries.post(slug));
  const toc = useMemo(() => (post.data ? extractToc(post.data.contentMd) : []), [post.data]);
  const activeId = useActiveHeading(toc.map((t) => t.id));

  if (post.isError && post.error instanceof ApiError && post.error.status === 404) {
    return <NotFoundPage message="That post doesn't exist or hasn't been published yet." />;
  }

  return (
    <Container className="py-14">
      {post.isPending ? (
        <div className="mx-auto max-w-3xl space-y-4" aria-busy>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      ) : post.isError ? (
        <ErrorState error={post.error} onRetry={() => void post.refetch()} />
      ) : (
        <>
          <Seo title={post.data.title} description={post.data.excerpt} type="article" />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <article className="mx-auto w-full max-w-3xl">
              <Link
                to="/blog"
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ← All posts
              </Link>
              <header className="mt-6 border-b border-zinc-200 pb-8 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {post.data.publishedAt && (
                    <time dateTime={post.data.publishedAt}>
                      {formatDate(post.data.publishedAt)}
                    </time>
                  )}
                  <span aria-hidden>·</span>
                  <span>{post.data.readingTimeMin} min read</span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
                  {post.data.title}
                </h1>
                <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">{post.data.excerpt}</p>
                {post.data.tags.length > 0 && (
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
                    {post.data.tags.map((t) => (
                      <li key={t.slug}>
                        <TagLink tag={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </header>

              <Markdown className="mt-10">{post.data.contentMd}</Markdown>

              {(post.data.previous || post.data.next) && (
                <nav
                  aria-label="More posts"
                  className="mt-16 grid gap-4 border-t border-zinc-200 pt-8 sm:grid-cols-2 dark:border-zinc-800"
                >
                  {post.data.previous ? (
                    <Link
                      to={`/blog/${post.data.previous.slug}`}
                      className="group rounded-xl border border-zinc-200 p-4 transition hover:border-accent-500 dark:border-zinc-800"
                    >
                      <span className="text-xs uppercase tracking-wide text-zinc-500">← Older</span>
                      <span className="mt-1 block font-medium text-zinc-900 group-hover:text-accent-700 dark:text-zinc-100 dark:group-hover:text-accent-400">
                        {post.data.previous.title}
                      </span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {post.data.next && (
                    <Link
                      to={`/blog/${post.data.next.slug}`}
                      className="group rounded-xl border border-zinc-200 p-4 text-right transition hover:border-accent-500 dark:border-zinc-800"
                    >
                      <span className="text-xs uppercase tracking-wide text-zinc-500">Newer →</span>
                      <span className="mt-1 block font-medium text-zinc-900 group-hover:text-accent-700 dark:text-zinc-100 dark:group-hover:text-accent-400">
                        {post.data.next.title}
                      </span>
                    </Link>
                  )}
                </nav>
              )}
            </article>

            {toc.length > 1 && (
              <aside className="hidden lg:block">
                <nav aria-label="Table of contents" className="sticky top-24">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    On this page
                  </p>
                  <ul className="mt-3 space-y-2 border-l border-zinc-200 text-sm dark:border-zinc-800">
                    {toc.map((entry) => (
                      <li key={entry.id}>
                        <a
                          href={`#${entry.id}`}
                          className={clsx(
                            '-ml-px block border-l-2 py-0.5 transition',
                            entry.depth === 3 ? 'pl-6' : 'pl-3',
                            activeId === entry.id
                              ? 'border-accent-500 text-zinc-900 dark:text-zinc-50'
                              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                          )}
                        >
                          {entry.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}
          </div>
        </>
      )}
    </Container>
  );
}
