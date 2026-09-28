import { useQuery } from '@tanstack/react-query';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import { Container, EmptyState, ErrorState, Skeleton } from '../components/ui.tsx';
import { queries } from '../lib/queries.ts';

export function ProjectsPage() {
  const projects = useQuery(queries.projects());
  return (
    <Container className="py-14">
      <Seo
        title="Projects"
        description="Things I've built — side projects, tools and experiments."
      />
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        Projects
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Side projects, tools and experiments.
      </p>
      <div className="mt-10">
        {projects.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        ) : projects.data.length === 0 ? (
          <EmptyState title="No projects yet" />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {projects.data.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
