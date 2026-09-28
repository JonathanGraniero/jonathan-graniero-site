import { useQuery } from '@tanstack/react-query';
import { ProjectCard } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import { Container, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx';
import { queries } from '../lib/queries.ts';

export function ProjectsPage() {
  const projects = useQuery(queries.projects());
  return (
    <Container className="py-16 sm:py-20">
      <Seo
        title="Projects"
        description="Things I've built — side projects, tools and experiments."
      />
      <PageHeader eyebrow="// projects" title="Things I've built">
        Operators, open-source contributions, tools and experiments.
      </PageHeader>
      <div className="mt-12">
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
