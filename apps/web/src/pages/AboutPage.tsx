import { useQuery } from '@tanstack/react-query';
import type { Skill, SkillCategory } from '@site/shared';
import { Markdown } from '../components/Markdown.tsx';
import { Seo } from '../components/Seo.tsx';
import {
  Badge,
  ButtonLink,
  Container,
  ErrorState,
  SectionHeading,
  Skeleton,
} from '../components/ui.tsx';
import { formatRange } from '../lib/format.ts';
import { queries, useProfile } from '../lib/queries.ts';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  LANGUAGE: 'Languages',
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  DATA: 'Data',
  INFRA: 'Infrastructure',
  TOOLING: 'Tooling',
};

function groupSkills(skills: Skill[]) {
  const groups = new Map<SkillCategory, Skill[]>();
  for (const s of skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
  return [...groups];
}

export function AboutPage() {
  const profile = useProfile();
  const experience = useQuery(queries.experience());
  const skills = useQuery(queries.skills());

  return (
    <Container className="py-14">
      <Seo title="About" description={profile.data?.headline} />
      <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
        <section>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            About me
          </h1>
          {profile.isPending ? (
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : profile.isError ? (
            <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
          ) : (
            <>
              <Markdown className="mt-6 prose-lg">{profile.data.bio}</Markdown>
              <div className="mt-8 flex flex-wrap gap-3">
                {profile.data.resumeUrl && (
                  <a
                    href={profile.data.resumeUrl}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white hover:bg-accent-800 dark:bg-accent-500 dark:text-zinc-950"
                    download
                  >
                    Download résumé
                  </a>
                )}
                <ButtonLink to="/contact" variant="secondary">
                  Get in touch
                </ButtonLink>
              </div>
            </>
          )}
        </section>

        <aside className="self-start rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-zinc-500">Based in</dt>
              <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100">
                {profile.data?.location ?? '—'}
              </dd>
            </div>
            {profile.data?.social.email && (
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${profile.data.social.email}`}
                    className="font-medium text-accent-700 hover:underline dark:text-accent-400"
                  >
                    {profile.data.social.email}
                  </a>
                </dd>
              </div>
            )}
            {profile.data?.social.github && (
              <div>
                <dt className="text-zinc-500">GitHub</dt>
                <dd className="mt-0.5">
                  <a
                    href={profile.data.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent-700 hover:underline dark:text-accent-400"
                  >
                    {profile.data.social.github.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      {/* Hidden until there's work history to show. */}
      {!(experience.isSuccess && experience.data.length === 0) && (
        <section className="mt-20" aria-labelledby="experience">
          <SectionHeading>
            <span id="experience">Experience</span>
          </SectionHeading>
          {experience.isPending ? (
            <Skeleton className="h-48" />
          ) : experience.isError ? (
            <ErrorState error={experience.error} />
          ) : (
            <ol className="relative space-y-10 border-l border-zinc-200 pl-8 dark:border-zinc-800">
              {experience.data.map((job) => (
                <li key={job.id} className="relative">
                  <span
                    aria-hidden
                    className={`absolute -left-[37px] top-1.5 size-3 rounded-full ring-4 ring-white dark:ring-zinc-950 ${job.endDate ? 'bg-zinc-300 dark:bg-zinc-600' : 'bg-accent-500'}`}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {job.role} <span className="font-normal text-zinc-500">· {job.company}</span>
                    </h3>
                    <p className="font-mono text-xs text-zinc-500">
                      {formatRange(job.startDate, job.endDate)}
                    </p>
                  </div>
                  {job.location && <p className="text-sm text-zinc-500">{job.location}</p>}
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">{job.summary}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 marker:text-accent-500 dark:text-zinc-400">
                    {job.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
                    {job.tech.map((t) => (
                      <li key={t}>
                        <Badge>{t}</Badge>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="mt-20" aria-labelledby="skills">
        <SectionHeading>
          <span id="skills">Skills</span>
        </SectionHeading>
        {skills.isPending ? (
          <Skeleton className="h-40" />
        ) : skills.isError ? (
          <ErrorState error={skills.error} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groupSkills(skills.data).map(([category, items]) => (
              <div
                key={category}
                className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {CATEGORY_LABELS[category]}
                </h3>
                <ul className="mt-3 space-y-2">
                  {items.map((s) => (
                    <li key={s.id} className="text-sm text-zinc-800 dark:text-zinc-200">
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
