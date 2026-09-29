import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import type { MessageListQuery, PostListQuery } from '@site/shared';
import { api } from './api.ts';

/**
 * Query definitions live in one place so keys stay consistent between
 * fetching, prefetching and cache invalidation.
 */
export const queries = {
  posts: (q: PostListQuery = {}) =>
    queryOptions({
      queryKey: ['posts', 'list', q] as const,
      queryFn: ({ signal }) => api.posts.list(q, signal),
      placeholderData: keepPreviousData,
    }),
  post: (slug: string) =>
    queryOptions({
      queryKey: ['posts', 'detail', slug] as const,
      queryFn: ({ signal }) => api.posts.get(slug, signal),
    }),
  tags: () => queryOptions({ queryKey: ['tags'] as const, queryFn: api.tags.list }),
  profile: () =>
    queryOptions({
      queryKey: ['profile'] as const,
      queryFn: api.profile.get,
      staleTime: 5 * 60_000,
    }),
  experience: () =>
    queryOptions({
      queryKey: ['experience'] as const,
      queryFn: api.profile.experience,
      staleTime: 5 * 60_000,
    }),
  skills: () =>
    queryOptions({
      queryKey: ['skills'] as const,
      queryFn: api.profile.skills,
      staleTime: 5 * 60_000,
    }),
  projects: (featured?: boolean) =>
    queryOptions({
      queryKey: ['projects', { featured: featured ?? false }] as const,
      queryFn: () => api.profile.projects(featured),
      staleTime: 5 * 60_000,
    }),
  me: () =>
    queryOptions({
      queryKey: ['auth', 'me'] as const,
      queryFn: api.auth.me,
      retry: false,
      staleTime: 60_000,
    }),
  adminPosts: (q: PostListQuery & { status?: 'DRAFT' | 'PUBLISHED' } = {}) =>
    queryOptions({
      queryKey: ['admin', 'posts', q] as const,
      queryFn: () => api.admin.posts.list(q),
      placeholderData: keepPreviousData,
    }),
  adminMessages: (q: MessageListQuery = {}) =>
    queryOptions({
      queryKey: ['admin', 'messages', 'list', q] as const,
      queryFn: () => api.admin.messages.list(q),
      placeholderData: keepPreviousData,
    }),
  messageStats: () =>
    queryOptions({
      queryKey: ['admin', 'messages', 'stats'] as const,
      queryFn: api.admin.messages.stats,
      // Keep the nav badge fresh while the admin is open.
      refetchInterval: 60_000,
    }),
  adminPost: (id: string) =>
    queryOptions({
      queryKey: ['admin', 'post', id] as const,
      queryFn: () => api.admin.posts.get(id),
    }),
};

export const useProfile = () => useQuery(queries.profile());
