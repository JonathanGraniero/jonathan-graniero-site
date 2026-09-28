import type { PostDetail, PostNeighbor, PostSummary } from '@site/shared';
import type { Post, Tag } from '../generated/prisma/client.ts';

export type PostWithTags = Post & { tags: Tag[] };

export const postInclude = { tags: { orderBy: { name: 'asc' } } } as const;

export function toPostSummary(post: PostWithTags): PostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    status: post.status,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    readingTimeMin: post.readingTimeMin,
    tags: post.tags.map((t) => ({ slug: t.slug, name: t.name })),
  };
}

export function toPostDetail(
  post: PostWithTags,
  neighbors: { previous: PostNeighbor | null; next: PostNeighbor | null } = {
    previous: null,
    next: null,
  },
): PostDetail {
  return {
    ...toPostSummary(post),
    contentMd: post.contentMd,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    ...neighbors,
  };
}
