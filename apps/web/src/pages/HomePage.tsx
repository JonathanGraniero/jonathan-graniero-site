import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Comment, Dash, K, Line, Seq, V, YamlBlock } from '../components/Manifest.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { PostsTable, PostsTableSkeleton } from '../components/PostsTable.tsx';
import { ProjectsTable } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import {
  ArrowLink,
  Badge,
  Container,
  ErrorState,
  SectionHeading,
  Skeleton,
  Status,
} from '../components/ui.tsx';
import { CASE_STUDIES, KFLARE, KFLARE_KIND_COUNT } from '../lib/kflare.ts';
import { queries, useProfile } from '../lib/queries.ts';
import { SITE } from '../lib/site.ts';

export function HomePage() {
  const profile = useProfile();
  const posts = useQuery(queries.posts({ pageSize: 5 }));
  const projects = useQuery(queries.projects(true));
  const latest = posts.data?.items[0];
  const building = projects.data?.[0];
  const name = profile.data?.name ?? 'Jonathan Graniero';
  const k8sName = name.toLowerCase().replace(/\s+/g, '-');

  return (
    <>
      <Seo description={profile.data?.headline} />

      <Container className="pt-14 sm:pt-20">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs text-faint">
              <span className="text-signal">$</span> whoami
            </p>
            {profile.isPending ? (
              <div className="mt-5 space-y-4">
                <Skeleton className="h-10 w-80 max-w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : (
              <>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">{name}</h1>
                <p className="mt-5 font-serif text-xl leading-relaxed text-dim sm:text-2xl">
                  {profile.data?.headline}
                </p>
              </>
            )}
          </div>
          <Portrait name={name} />
        </div>

        <div className="mt-12">
          <YamlBlock title={`kubectl get engineer ${k8sName} -o yaml`}>
            <Line>
              <K>apiVersion</K>
              <V>people.graniero.dev/v1</V>
            </Line>
            <Line>
              <K>kind</K>
              <V>Engineer</V>
            </Line>
            <Line>
              <K>metadata</K>
            </Line>
            <Line level={1}>
              <K>name</K>
              <V>{k8sName}</V>
            </Line>
            <Line level={1}>
              <K>labels</K>
            </Line>
            <Line level={2}>
              <K>location</K>
              <V>
                {(profile.data?.location ?? 'remote')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '')}
              </V>
            </Line>
            <Line>
              <K>spec</K>
            </Line>
            <Line level={1}>
              <K>employer</K>
              <V>{SITE.employer}</V>
            </Line>
            <Line level={1}>
              <K>focus</K>
              <Seq items={SITE.focus} />
            </Line>
            <Line level={1}>
              <K>languages</K>
              <Seq items={SITE.languages} />
            </Line>
            <Line>
              <K>status</K>
            </Line>
            <Line level={1}>
              <K>conditions</K>
            </Line>
            <Line level={1}>
              <Dash />
              <K>type</K>
              <V>Writing</V>
            </Line>
            <Line level={2}>
              <K>status</K>
              <V str>True</V>
            </Line>
            {latest && (
              <Line level={2}>
                <K>message</K>
                <Link
                  to={`/blog/${latest.slug}`}
                  className="text-signal underline-offset-4 hover:underline"
                >
                  {latest.title}
                </Link>
              </Line>
            )}
            <Line level={1}>
              <Dash />
              <K>type</K>
              <V>Building</V>
            </Line>
            <Line level={2}>
              <K>status</K>
              <V str>True</V>
            </Line>
            {building && (
              <Line level={2}>
                <K>message</K>
                <Link
                  to={CASE_STUDIES[building.name] ?? '/projects'}
                  className="text-signal underline-offset-4 hover:underline"
                >
                  {building.name}
                </Link>{' '}
                <Comment>see {CASE_STUDIES[building.name] ?? '/projects'}</Comment>
              </Line>
            )}
          </YamlBlock>
        </div>
      </Container>

      <Container className="mt-20 space-y-20">
        <KflareSpotlight />

        <section aria-labelledby="recent-posts">
          <SectionHeading
            command="kubectl get posts --sort-by=.metadata.creationTimestamp"
            action={<ArrowLink to="/blog">all posts</ArrowLink>}
          >
            <span id="recent-posts">Recent writing</span>
          </SectionHeading>
          {posts.isPending ? (
            <PostsTableSkeleton />
          ) : posts.isError ? (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          ) : (
            <PostsTable posts={posts.data.items} />
          )}
        </section>

        <section aria-labelledby="featured-projects">
          <SectionHeading
            command="kubectl get projects -l featured=true"
            action={<ArrowLink to="/projects">all projects</ArrowLink>}
          >
            <span id="featured-projects">Building</span>
          </SectionHeading>
          {projects.isPending ? (
            <PostsTableSkeleton />
          ) : projects.isError ? (
            <ErrorState error={projects.error} />
          ) : (
            <ProjectsTable projects={projects.data} />
          )}
        </section>
      </Container>
    </>
  );
}

/** The project I'm spending the most time on, ahead of the posts and the project list. */
function KflareSpotlight() {
  return (
    <section aria-labelledby="kflare-spotlight">
      <SectionHeading
        command="kubectl get operator kflare"
        action={<ArrowLink to={KFLARE.path}>the details</ArrowLink>}
      >
        <span id="kflare-spotlight">kflare: Cloudflare, managed from Kubernetes</span>
      </SectionHeading>
      <div className="grid gap-8 md:grid-cols-[1fr_22rem]">
        <div>
          <p className="font-serif text-lg leading-relaxed text-dim">
            A Kubernetes operator I&apos;m building that manages Cloudflare through custom
            resources: zones, DNS, tunnels, Workers, KV, R2, D1, the WAF and the Rules products,
            reviewed and applied like the rest of the cluster. Every kind is tested live against a
            real Cloudflare account in CI.
          </p>
          <div className="mt-5 flex flex-wrap gap-1">
            {KFLARE.areas.map(({ area }) => (
              <Badge key={area}>{area}</Badge>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-[6rem_1fr] content-start gap-y-2 border border-line bg-panel p-5 text-xs">
          <dt className="text-faint">Status:</dt>
          <dd>
            <Status>v{KFLARE.version} released</Status>
          </dd>
          <dt className="text-faint">Released:</dt>
          <dd>{KFLARE.released}</dd>
          <dt className="text-faint">Kinds:</dt>
          <dd>{KFLARE_KIND_COUNT}</dd>
          <dt className="text-faint">Install:</dt>
          <dd>
            <a
              href={KFLARE.links.artifactHub}
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal underline-offset-4 hover:underline"
            >
              Helm chart ↗
            </a>
          </dd>
          <dt className="text-faint">Source:</dt>
          <dd>
            <a
              href={KFLARE.links.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-signal underline-offset-4 hover:underline"
            >
              GitHub ↗
            </a>
          </dd>
        </dl>
      </div>
    </section>
  );
}
