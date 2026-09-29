import { useQuery } from '@tanstack/react-query';
import type { Skill, SkillCategory } from '@site/shared';
import type { ReactNode } from 'react';
import { Markdown } from '../components/Markdown.tsx';
import { Portrait } from '../components/Portrait.tsx';
import { Seo } from '../components/Seo.tsx';
import {
  Badge,
  ButtonLink,
  Container,
  ErrorState,
  PageHeader,
  SectionHeading,
  Skeleton,
  Status,
} from '../components/ui.tsx';
import { formatRange } from '../lib/format.ts';
import { queries, useProfile } from '../lib/queries.ts';
import { SITE } from '../lib/site.ts';

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  LANGUAGE: 'languages',
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  DATA: 'data',
  INFRA: 'infrastructure',
  TOOLING: 'tooling',
};

function groupSkills(skills: Skill[]) {
  const groups = new Map<SkillCategory, Skill[]>();
  for (const s of skills) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
  return [...groups];
}

const external = { target: '_blank', rel: 'noopener noreferrer' } as const;
const strip = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-faint">{label}:</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

export function AboutPage() {
  const profile = useProfile();
  const experience = useQuery(queries.experience());
  const skills = useQuery(queries.skills());
  const name = profile.data?.name ?? 'Jonathan Graniero';
  const k8sName = name.toLowerCase().replace(/\s+/g, '-');

  return (
    <Container className="py-14 sm:py-20">
      <Seo title="About" description={profile.data?.headline} />
      <PageHeader command={`kubectl describe engineer ${k8sName}`} title="About" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          {profile.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : profile.isError ? (
            <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
          ) : (
            <>
              <Markdown className="text-[1.15rem]">{profile.data.bio}</Markdown>
              <div className="mt-8 flex flex-wrap gap-3">
                {profile.data.resumeUrl && (
                  <a
                    href={profile.data.resumeUrl}
                    download
                    className="inline-flex items-center border border-signal bg-signal px-4 py-2 text-xs font-medium tracking-wider text-signal-ink uppercase"
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

        <aside className="self-start border border-line bg-panel">
          <div className="flex gap-4 border-b border-line p-5">
            <Portrait name={name} className="w-24! sm:w-28!" />
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-ink">{name}</p>
              <p className="mt-1 text-faint">engineer/{k8sName}</p>
              <p className="mt-3">
                <Status>Ready</Status>
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2.5 p-5 text-xs">
            <Field label="Location">{profile.data?.location ?? '—'}</Field>
            <Field label="Employer">{SITE.employer}</Field>
            <Field label="Education">{SITE.education}</Field>
            {profile.data?.social.github && (
              <Field label="GitHub">
                <a
                  href={profile.data.social.github}
                  {...external}
                  className="text-signal hover:underline"
                >
                  {strip(profile.data.social.github)}
                </a>
              </Field>
            )}
            {profile.data?.social.linkedin && (
              <Field label="LinkedIn">
                <a
                  href={profile.data.social.linkedin}
                  {...external}
                  className="text-signal hover:underline"
                >
                  {strip(profile.data.social.linkedin).replace('linkedin.com', 'in')}
                </a>
              </Field>
            )}
            {profile.data?.social.email && (
              <Field label="Email">
                <a
                  href={`mailto:${profile.data.social.email}`}
                  className="text-signal hover:underline"
                >
                  {profile.data.social.email}
                </a>
              </Field>
            )}
          </dl>
        </aside>
      </div>

      {/* Hidden until there's work history to show. */}
      {!(experience.isSuccess && experience.data.length === 0) && (
        <section className="mt-20" aria-labelledby="experience">
          <SectionHeading command={`kubectl rollout history engineer/${k8sName}`}>
            <span id="experience">Experience</span>
          </SectionHeading>
          {experience.isPending ? (
            <Skeleton className="h-40" />
          ) : experience.isError ? (
            <ErrorState error={experience.error} />
          ) : (
            <ol className="text-sm">
              {experience.data.map((job, i) => (
                <li
                  key={job.id}
                  className="grid gap-3 border-t border-line py-6 md:grid-cols-[4rem_1fr]"
                >
                  <span className="text-xs text-faint">rev {experience.data.length - i}</span>
                  <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold">
                        {job.role} <span className="text-dim">@ {job.company}</span>
                      </h3>
                      <span className="text-xs text-faint">
                        {formatRange(job.startDate, job.endDate)}
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-base text-dim">{job.summary}</p>
                    <ul className="mt-3 space-y-1 font-serif text-[15px] text-dim">
                      {job.highlights.map((h) => (
                        <li key={h} className="flex gap-2">
                          <span className="text-signal">›</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {job.tech.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <section className="mt-20" aria-labelledby="skills">
        <SectionHeading command="kubectl api-resources --namespaced=false">
          <span id="skills">Toolbox</span>
        </SectionHeading>
        {skills.isPending ? (
          <Skeleton className="h-40" />
        ) : skills.isError ? (
          <ErrorState error={skills.error} />
        ) : (
          <dl className="text-sm">
            {groupSkills(skills.data).map(([category, items]) => (
              <div
                key={category}
                className="grid gap-2 border-t border-line py-4 md:grid-cols-[10rem_1fr]"
              >
                <dt className="text-xs text-faint uppercase">{CATEGORY_LABELS[category]}</dt>
                <dd className="flex flex-wrap gap-x-5 gap-y-1">
                  {items.map((s) => (
                    <span key={s.id}>{s.name}</span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </Container>
  );
}
