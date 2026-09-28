import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { HeroArt } from '../components/art/HeroArt.tsx';
import { GitHubIcon, LinkedInIcon } from '../components/icons.tsx';
import { PostCard, PostCardSkeleton } from '../components/PostCard.tsx';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import {
  ArrowLink,
  ButtonLink,
  Container,
  ErrorState,
  SectionHeading,
  Skeleton,
} from '../components/ui.tsx';
import { queries, useProfile } from '../lib/queries.ts';

export function HomePage() {
  const profile = useProfile();
  const posts = useQuery(queries.posts({ pageSize: 3 }));
  const projects = useQuery(queries.projects(true));
  const latest = posts.data?.items[0];

  return (
    <>
      <Seo description={profile.data?.headline} />

      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-8 pt-16 pb-12 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:pb-20">
          <div className="animate-fade-up relative z-10">
            {latest && (
              <Link
                to={`/blog/${latest.slug}`}
                className="group mb-8 inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white/60 py-1 pr-3 pl-1 text-sm backdrop-blur transition hover:border-accent-500/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-accent-400/40"
              >
                <span className="rounded-full bg-gradient-to-r from-accent-500 to-accent2-500 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                  new
                </span>
                <span className="truncate text-zinc-700 dark:text-zinc-300">{latest.title}</span>
                <span aria-hidden className="text-zinc-400 transition group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            )}

            {profile.isPending ? (
              <div className="space-y-4">
                <Skeleton className="h-14 w-96 max-w-full" />
                <Skeleton className="h-6 w-full max-w-xl" />
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                  <span className="text-gradient">
                    Hi, I&apos;m {profile.data?.name.split(' ')[0] ?? 'Jonathan'}.
                  </span>
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400">
                  {profile.data?.headline}
                </p>
              </>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink to="/blog">Read the blog</ButtonLink>
              <ButtonLink to="/about" variant="secondary">
                About &amp; career
              </ButtonLink>
              <div className="ml-1 flex items-center gap-1">
                {profile.data?.social.github && (
                  <a
                    href={profile.data.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="grid size-10 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <GitHubIcon className="size-5" />
                  </a>
                )}
                {profile.data?.social.linkedin && (
                  <a
                    href={profile.data.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="grid size-10 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-900/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <LinkedInIcon className="size-4.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Decorative: sits behind the text on small screens, beside it on large ones. */}
          <div className="pointer-events-none absolute -right-24 -top-10 w-[34rem] opacity-25 sm:opacity-50 lg:pointer-events-auto lg:relative lg:top-0 lg:right-0 lg:w-full lg:opacity-100">
            <HeroArt className="w-full" />
          </div>
        </Container>
      </section>

      <Container className="space-y-24 py-12">
        <section aria-labelledby="recent-posts">
          <SectionHeading eyebrow="// writing" action={<ArrowLink to="/blog">All posts</ArrowLink>}>
            <span id="recent-posts">Recent posts</span>
          </SectionHeading>
          {posts.isPending ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <PostCardSkeleton key={i} layout="tile" />
              ))}
            </div>
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {posts.data.items.map((p) => (
                <PostCard key={p.id} post={p} layout="tile" />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="featured-projects">
          <SectionHeading
            eyebrow="// building"
            action={<ArrowLink to="/projects">All projects</ArrowLink>}
          >
            <span id="featured-projects">Featured projects</span>
          </SectionHeading>
          {projects.isPending ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : projects.isError ? (
            <ErrorState error={projects.error} />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {projects.data.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
