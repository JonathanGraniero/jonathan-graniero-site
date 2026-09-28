import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PostCard, PostCardSkeleton } from '../components/PostCard.tsx';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import { ButtonLink, Container, ErrorState, SectionHeading, Skeleton } from '../components/ui.tsx';
import { queries, useProfile } from '../lib/queries.ts';

export function HomePage() {
  const profile = useProfile();
  const posts = useQuery(queries.posts({ pageSize: 3 }));
  const projects = useQuery(queries.projects(true));

  return (
    <>
      <Seo description={profile.data?.headline} />
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--color-accent-100),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklch,var(--color-accent-900)_45%,transparent),transparent_60%)]"
        />
        <Container className="relative py-20 sm:py-28">
          <p className="font-mono text-sm text-accent-700 dark:text-accent-400">Hi, I&apos;m</p>
          {profile.isPending ? (
            <div className="mt-3 space-y-4">
              <Skeleton className="h-12 w-80" />
              <Skeleton className="h-6 w-full max-w-xl" />
            </div>
          ) : (
            <>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
                {profile.data?.name ?? 'Jonathan Graniero'}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400">
                {profile.data?.headline}
              </p>
            </>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/blog">Read the blog</ButtonLink>
            <ButtonLink to="/about" variant="secondary">
              About &amp; career
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="grid gap-16 py-16 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="recent-posts">
          <SectionHeading
            action={
              <Link
                to="/blog"
                className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400"
              >
                All posts →
              </Link>
            }
          >
            <span id="recent-posts">Recent writing</span>
          </SectionHeading>
          {posts.isPending ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          ) : (
            <div className="flex flex-col gap-2">
              {posts.data.items.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="featured-projects">
          <SectionHeading
            action={
              <Link
                to="/projects"
                className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-400"
              >
                All projects →
              </Link>
            }
          >
            <span id="featured-projects">Featured projects</span>
          </SectionHeading>
          {projects.isPending ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : projects.isError ? (
            <ErrorState error={projects.error} />
          ) : (
            <div className="flex flex-col gap-4">
              {projects.data.map((p) => (
                <ProjectCard key={p.id} project={p} compact />
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
