import type { Project } from '@site/shared';
import { CoverArt } from './art/CoverArt.tsx';
import { Badge, Status } from './ui.tsx';

const primaryLabel = (url: string) => (/\/pull\/\d+/.test(url) ? 'pull-request' : 'live');

function ProjectLinks({ project }: { project: Project }) {
  return (
    <span className="relative z-10 flex gap-3 text-xs whitespace-nowrap">
      {project.url && (
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-dim hover:text-signal"
        >
          {primaryLabel(project.url)} ↗
        </a>
      )}
      {project.repoUrl && (
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-dim hover:text-signal"
        >
          source ↗
        </a>
      )}
    </span>
  );
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Compact `kubectl get projects` listing for the home page. */
export function ProjectsTable({ projects }: { projects: Project[] }) {
  return (
    <div role="table" aria-label="Projects" className="text-sm">
      <div
        role="row"
        className="hidden grid-cols-[1fr_16rem_10rem] gap-6 pb-2 text-[11px] text-faint md:grid"
      >
        <span role="columnheader">NAME</span>
        <span role="columnheader">LABELS</span>
        <span role="columnheader" className="text-right">
          LINKS
        </span>
      </div>
      {projects.map((p) => (
        <div
          role="row"
          key={p.id}
          className="grid gap-2 border-t border-line py-4 md:grid-cols-[1fr_16rem_10rem] md:gap-6"
        >
          <div role="cell" className="min-w-0">
            <span className="font-semibold">{p.name}</span>
            <p className="mt-1.5 line-clamp-2 font-serif text-[15px] leading-snug text-dim">
              {p.description}
            </p>
          </div>
          <div role="cell" className="flex flex-wrap content-start gap-1">
            {p.tech.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <div role="cell" className="md:flex md:justify-end">
            <ProjectLinks project={p} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full `kubectl describe`-style block for the projects page. */
export function ProjectDetail({ project }: { project: Project }) {
  return (
    <article className="grid border border-line bg-panel md:grid-cols-[18rem_1fr]">
      <div className="aspect-[2/1] border-b border-line md:aspect-auto md:border-r md:border-b-0">
        <CoverArt seed={project.name} className="size-full" />
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-[11px] text-faint">project/{slug(project.name)}</p>
        <h3 className="mt-2 text-lg font-semibold">{project.name}</h3>
        <p className="mt-3 font-serif text-base leading-relaxed text-dim">{project.description}</p>
        <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2 text-xs">
          <dt className="text-faint">Status:</dt>
          <dd>
            {project.featured ? <Status>Featured</Status> : <Status tone="idle">Archived</Status>}
          </dd>
          <dt className="text-faint">Labels:</dt>
          <dd className="flex flex-wrap gap-1">
            {project.tech.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </dd>
          {(project.url || project.repoUrl) && (
            <>
              <dt className="text-faint">Links:</dt>
              <dd>
                <ProjectLinks project={project} />
              </dd>
            </>
          )}
        </dl>
      </div>
    </article>
  );
}
