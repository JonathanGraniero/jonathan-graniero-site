/**
 * API contract shared by `@site/api` and `@site/web`.
 *
 * This package is types-only: consumers must use `import type`. Dates cross the
 * wire as ISO-8601 strings.
 */

export type ISODateString = string;

// ---------- Generic ----------

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: ISODateString;
}

// ---------- Posts & tags ----------

export type PostStatus = 'DRAFT' | 'PUBLISHED';

export interface Tag {
  slug: string;
  name: string;
}

export interface TagWithCount extends Tag {
  postCount: number;
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  status: PostStatus;
  publishedAt: ISODateString | null;
  readingTimeMin: number;
  tags: Tag[];
}

export interface PostNeighbor {
  slug: string;
  title: string;
}

export interface PostDetail extends PostSummary {
  contentMd: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Chronologically adjacent published posts (only populated on public reads). */
  previous: PostNeighbor | null;
  next: PostNeighbor | null;
}

export interface PostListQuery {
  page?: number;
  pageSize?: number;
  tag?: string;
  q?: string;
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  excerpt: string;
  contentMd: string;
  coverImage?: string | null;
  status?: PostStatus;
  tags?: string[];
}

export type UpdatePostInput = Partial<CreatePostInput>;

// ---------- Profile / career ----------

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  email?: string;
  website?: string;
}

export interface Profile {
  name: string;
  headline: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
  resumeUrl: string | null;
  social: SocialLinks;
}

/** `null` clears a link; omitted keys are left unchanged. */
export type SocialLinksInput = { [K in keyof SocialLinks]?: string | null };

export type UpdateProfileInput = Partial<Omit<Profile, 'social'>> & { social?: SocialLinksInput };

export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string | null;
  startDate: ISODateString;
  endDate: ISODateString | null;
  summary: string;
  highlights: string[];
  tech: string[];
}

export type SkillCategory = 'LANGUAGE' | 'FRONTEND' | 'BACKEND' | 'DATA' | 'INFRA' | 'TOOLING';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  /** 1 (familiar) – 5 (expert) */
  level: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string | null;
  repoUrl: string | null;
  tech: string[];
  featured: boolean;
}

// ---------- Contact ----------

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  /** Honeypot: hidden from humans, so any value marks the submission as spam. */
  website?: string;
}

export interface ContactReceipt {
  id: string;
  receivedAt: ISODateString;
}

// ---------- Auth ----------

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
}
