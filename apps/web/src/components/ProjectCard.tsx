import type { Project } from '@site/shared';
import { Badge } from './ui.tsx';

export function ProjectCard({ project, compact = false }: { project: Project; compact?: boolean }) {
  return (
    <article className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent-500/60 hover:shadow-lg hover:shadow-accent-900/5 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-accent-500/50">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{project.name}</h3>
        {project.featured && !compact && (
          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-800 dark:bg-accent-900/40 dark:text-accent-300">
            Featured
          </span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {project.description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
        {project.tech.map((t) => (
          <li key={t}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
      {(project.url || project.repoUrl) && (
        <div className="mt-4 flex gap-4 text-sm font-medium">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 hover:underline dark:text-accent-400"
            >
              Live site ↗
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-700 hover:underline dark:text-accent-400"
            >
              Source ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}
