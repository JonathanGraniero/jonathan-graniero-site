import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { CoverArt } from '../components/art/CoverArt.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Seo } from '../components/Seo.tsx';
import { TagLink } from '../components/TagLink.tsx';
import { Container, ErrorState, Skeleton, Status } from '../components/ui.tsx';
import { ApiError } from '../lib/api.ts';
import { age, formatDate } from '../lib/format.ts';
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
    <Container className="py-12 sm:py-16">
      {post.isPending ? (
        <div className="max-w-3xl space-y-4" aria-busy>
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="mt-8 h-40 w-full" />
        </div>
      ) : post.isError ? (
        <ErrorState error={post.error} onRetry={() => void post.refetch()} />
      ) : (
        <>
          <Seo title={post.data.title} description={post.data.excerpt} type="article" />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <article className="min-w-0 max-w-3xl">
              <Link to="/blog" className="text-xs text-dim hover:text-signal">
                ← cd ../blog
              </Link>

              <header className="mt-8">
                <p className="text-xs text-faint">
                  <span className="text-signal">$</span> kubectl describe post/{post.data.slug}
                </p>
                <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  {post.data.title}
                </h1>
                <p className="mt-5 font-serif text-xl leading-relaxed text-dim">
                  {post.data.excerpt}
                </p>

                <div className="mt-8 grid border border-line bg-panel sm:grid-cols-[1fr_14rem]">
                  <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2.5 p-5 text-xs">
                    <dt className="text-faint">Name:</dt>
                    <dd className="truncate">{post.data.slug}</dd>
                    <dt className="text-faint">Labels:</dt>
                    <dd>
                      {post.data.tags.length > 0 ? (
                        <ul className="flex flex-wrap gap-1" aria-label="Tags">
                          {post.data.tags.map((t) => (
                            <li key={t.slug}>
                              <TagLink tag={t} />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-faint">&lt;none&gt;</span>
                      )}
                    </dd>
                    {post.data.publishedAt && (
                      <>
                        <dt className="text-faint">Created:</dt>
                        <dd>
                          <time dateTime={post.data.publishedAt}>
                            {formatDate(post.data.publishedAt)}
                          </time>{' '}
                          <span className="text-faint">({age(post.data.publishedAt)} ago)</span>
                        </dd>
                      </>
                    )}
                    <dt className="text-faint">Read time:</dt>
                    <dd>{post.data.readingTimeMin} min</dd>
                    <dt className="text-faint">Status:</dt>
                    <dd>
                      <Status>Ready</Status>
                    </dd>
                  </dl>
                  <div className="hidden border-l border-line sm:block">
                    {post.data.coverImage ? (
                      <img src={post.data.coverImage} alt="" className="size-full object-cover" />
                    ) : (
                      <CoverArt seed={post.data.slug} className="size-full" />
                    )}
                  </div>
                </div>
              </header>

              <Markdown className="mt-12">{post.data.contentMd}</Markdown>

              {(post.data.previous || post.data.next) && (
                <nav
                  aria-label="More posts"
                  className="mt-16 grid border border-line text-sm sm:grid-cols-2"
                >
                  {post.data.previous ? (
                    <Link
                      to={`/blog/${post.data.previous.slug}`}
                      className="group p-5 transition hover:bg-panel"
                    >
                      <span className="text-[11px] text-faint">← older</span>
                      <span className="mt-1 block font-semibold group-hover:text-signal">
                        {post.data.previous.title}
                      </span>
                    </Link>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  {post.data.next && (
                    <Link
                      to={`/blog/${post.data.next.slug}`}
                      className="group border-t border-line p-5 text-right transition hover:bg-panel sm:border-t-0 sm:border-l"
                    >
                      <span className="text-[11px] text-faint">newer →</span>
                      <span className="mt-1 block font-semibold group-hover:text-signal">
                        {post.data.next.title}
                      </span>
                    </Link>
                  )}
                </nav>
              )}
            </article>

            {toc.length > 1 && (
              <aside className="hidden lg:block">
                <nav aria-label="Table of contents" className="sticky top-20 pt-24">
                  <p className="text-[11px] text-faint">
                    <span className="text-signal">$</span> grep &apos;^##&apos;
                  </p>
                  <ul className="mt-4 space-y-2 text-xs">
                    {toc.map((entry) => (
                      <li key={entry.id}>
                        <a
                          href={`#${entry.id}`}
                          className={clsx(
                            'block border-l py-0.5 leading-snug transition',
                            entry.depth === 3 ? 'pl-6' : 'pl-3',
                            activeId === entry.id
                              ? 'border-signal text-signal'
                              : 'border-line text-dim hover:text-ink',
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
