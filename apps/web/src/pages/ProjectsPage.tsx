import { useQuery } from '@tanstack/react-query';
import { ProjectDetail } from '../components/ProjectCard.tsx';
import { Seo } from '../components/Seo.tsx';
import { Container, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.tsx';
import { queries } from '../lib/queries.ts';

export function ProjectsPage() {
  const projects = useQuery(queries.projects());
  return (
    <Container className="py-14 sm:py-20">
      <Seo
        title="Projects"
        description="Things I've built — side projects, tools and experiments."
      />
      <PageHeader command="kubectl get projects -o wide" title="Projects">
        Operators, open-source contributions, tools and experiments.
      </PageHeader>
      <div className="mt-12">
        {projects.isPending ? (
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : projects.isError ? (
          <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
        ) : projects.data.length === 0 ? (
          <EmptyState title="No projects yet" />
        ) : (
          <ul className="space-y-6">
            {projects.data.map((p) => (
              <li key={p.id}>
                <ProjectDetail project={p} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
