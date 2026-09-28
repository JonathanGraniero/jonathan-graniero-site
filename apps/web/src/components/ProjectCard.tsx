import type { Project } from '@site/shared';
import { CoverArt } from './art/CoverArt.tsx';
import { ArrowUpRightIcon, GitHubIcon } from './icons.tsx';
import { Badge } from './ui.tsx';

const linkClass =
  'relative z-10 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-zinc-700 transition hover:text-accent-700 dark:text-zinc-300 dark:hover:text-accent-300';

export function ProjectCard({ project }: { project: Project }) {
  const primaryLabel =
    project.url && /\/pull\/\d+/.test(project.url) ? 'Pull request' : 'Live site';

  return (
    <article className="glass-interactive group relative flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[2/1] overflow-hidden">
        <CoverArt
          seed={project.name}
          className="size-full transition duration-700 group-hover:scale-[1.04]"
        />
        {project.featured && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2.5 py-0.5 font-mono text-[11px] text-white backdrop-blur">
            featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
          {project.name}
        </h3>
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
          <div className="mt-5 flex gap-5 border-t border-zinc-200/70 pt-4 dark:border-white/[0.06]">
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {primaryLabel}
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                <GitHubIcon className="size-3.5" />
                Source
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
