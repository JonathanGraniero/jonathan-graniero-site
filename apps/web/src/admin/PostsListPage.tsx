import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Paginated, PostStatus, PostSummary } from '@site/shared';
import clsx from 'clsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Pagination } from '../components/Pagination.tsx';
import {
  Button,
  ButtonLink,
  Container,
  EmptyState,
  ErrorState,
  Skeleton,
} from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { formatDate } from '../lib/format.ts';
import { useDebouncedValue } from '../lib/hooks.ts';
import { queries } from '../lib/queries.ts';

const FILTERS: { label: string; value: PostStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
];

type Snapshot = [QueryKey, Paginated<PostSummary> | undefined][];

/** Shared optimistic-update plumbing for mutations on the admin post list. */
function useOptimisticListMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (items: PostSummary[], vars: TVars) => PostSummary[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'posts'] });
      const snapshot: Snapshot = queryClient.getQueriesData<Paginated<PostSummary>>({
        queryKey: ['admin', 'posts'],
      });
      queryClient.setQueriesData<Paginated<PostSummary>>({ queryKey: ['admin', 'posts'] }, (old) =>
        old ? { ...old, items: apply(old.items, vars) } : old,
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) =>
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function PostsListPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as PostStatus | null) ?? undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300) || undefined;
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const posts = useQuery(queries.adminPosts({ status, page, pageSize: 20, q }));

  const toggle = useOptimisticListMutation(
    ({ id, status }: { id: string; status: PostStatus }) => api.admin.posts.update(id, { status }),
    (items, { id, status }) => items.map((p) => (p.id === id ? { ...p, status } : p)),
  );
  const remove = useOptimisticListMutation(
    (id: string) => api.admin.posts.remove(id),
    (items, id) => items.filter((p) => p.id !== id),
  );

  const setParam = (key: string, value: string | undefined) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });

  return (
    <Container className="max-w-6xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Posts</h1>
        <ButtonLink to="/admin/posts/new">+ New post</ButtonLink>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          {FILTERS.map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setParam('status', f.value)}
              className={clsx(
                'rounded-md px-3 py-1 text-sm font-medium transition',
                status === f.value
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          aria-label="Search posts"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 dark:border-zinc-800 dark:bg-zinc-900"
        />
      </div>

      {(toggle.isError || remove.isError) && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {(toggle.error ?? remove.error)?.message} — changes were rolled back.
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {posts.isPending ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : posts.isError ? (
          <div className="p-6">
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          </div>
        ) : posts.data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No posts here yet">
              <Link
                to="/admin/posts/new"
                className="text-accent-700 hover:underline dark:text-accent-400"
              >
                Write your first post
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Title
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                    Published
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {posts.data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/posts/${post.id}`}
                        className="font-medium text-zinc-900 hover:text-accent-700 dark:text-zinc-100 dark:hover:text-accent-400"
                      >
                        {post.title}
                      </Link>
                      <div className="mt-0.5 font-mono text-xs text-zinc-400">/{post.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          post.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                        )}
                      >
                        {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 md:table-cell">
                      {post.publishedAt ? formatDate(post.publishedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete === post.id ? (
                          <>
                            <span className="mr-1 text-xs text-zinc-500">Delete?</span>
                            <Button
                              variant="danger"
                              className="px-2.5 py-1 text-xs"
                              onClick={() => {
                                remove.mutate(post.id);
                                setConfirmDelete(null);
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2.5 py-1 text-xs"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              className="px-2.5 py-1 text-xs"
                              onClick={() =>
                                toggle.mutate({
                                  id: post.id,
                                  status: post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                                })
                              }
                            >
                              {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                            </Button>
                            {post.status === 'PUBLISHED' && (
                              <Link
                                to={`/blog/${post.slug}`}
                                className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                              >
                                View
                              </Link>
                            )}
                            <Button
                              variant="dangerGhost"
                              className="px-2.5 py-1 text-xs"
                              onClick={() => setConfirmDelete(post.id)}
                              aria-label={`Delete ${post.title}`}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {posts.data && (
        <Pagination
          page={posts.data.page}
          totalPages={posts.data.totalPages}
          onChange={(p) => setParam('page', p > 1 ? String(p) : undefined)}
        />
      )}
    </Container>
  );
}
