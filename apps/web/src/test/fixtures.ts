import type { PostDetail, PostSummary, Profile, Project, TagWithCount } from '@site/shared';

export const profile: Profile = {
  name: 'Test Author',
  headline: 'Builds things for the web',
  bio: 'Hello, this is **my bio**.',
  location: 'Remote',
  avatarUrl: null,
  resumeUrl: null,
  social: { github: 'https://github.com/test' },
};

const summary = (n: number, tags: [string, string][]): PostSummary => ({
  id: `p${n}`,
  slug: `post-${n}`,
  title: `Post number ${n}`,
  excerpt: `Excerpt for post ${n}`,
  coverImage: null,
  status: 'PUBLISHED',
  publishedAt: `2026-0${n}-01T12:00:00.000Z`,
  readingTimeMin: n,
  tags: tags.map(([slug, name]) => ({ slug, name })),
});

export const posts: PostSummary[] = [
  summary(3, [['go', 'Go']]),
  summary(2, [['react', 'React']]),
  summary(1, [
    ['go', 'Go'],
    ['react', 'React'],
  ]),
];

export const tags: TagWithCount[] = [
  { slug: 'go', name: 'Go', postCount: 2 },
  { slug: 'react', name: 'React', postCount: 2 },
];

export const projects: Project[] = [
  {
    id: 'x1',
    name: 'Project X',
    description: 'Does X',
    url: null,
    repoUrl: 'https://github.com/x',
    tech: ['Go'],
    featured: true,
  },
];

export const postDetail = (slug: string): PostDetail | undefined => {
  const p = posts.find((x) => x.slug === slug);
  return (
    p && {
      ...p,
      contentMd: `## Intro\n\nBody of ${p.title}.\n\n## Details\n\nMore.`,
      createdAt: p.publishedAt!,
      updatedAt: p.publishedAt!,
      previous: null,
      next: null,
    }
  );
};
