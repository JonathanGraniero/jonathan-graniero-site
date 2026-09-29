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
        <h1 className="text-2xl font-bold tracking-tight text-ink">Posts</h1>
        <ButtonLink to="/admin/posts/new">+ New post</ButtonLink>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Filter by status"
          className="inline-flex border border-line bg-panel p-0.5"
        >
          {FILTERS.map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setParam('status', f.value)}
              className={clsx(
                ' px-3 py-1 text-sm font-medium transition',
                status === f.value ? 'bg-ink text-white' : 'text-dim hover:text-ink ',
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
          className="border border-line bg-panel px-3 py-1.5 text-sm focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30"
        />
      </div>

      {(toggle.isError || remove.isError) && (
        <p role="alert" className="mt-4 bg-err px-4 py-2 text-sm text-err">
          {(toggle.error ?? remove.error)?.message} — changes were rolled back.
        </p>
      )}

      <div className="mt-6 overflow-hidden border border-line bg-panel">
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
              <Link to="/admin/posts/new" className="text-signal hover:underline">
                Write your first post
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-line/40 text-xs uppercase tracking-wide text-faint">
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
              <tbody className="divide-y divide-line">
                {posts.data.items.map((post) => (
                  <tr key={post.id} className="hover:bg-line/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/posts/${post.id}`}
                        className="font-medium text-ink hover:text-signal"
                      >
                        {post.title}
                      </Link>
                      <div className="mt-0.5 font-mono text-xs text-faint">/{post.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          post.status === 'PUBLISHED' ? 'bg-ok text-ok' : 'bg-warn text-warn',
                        )}
                      >
                        {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-faint md:table-cell">
                      {post.publishedAt ? formatDate(post.publishedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {confirmDelete === post.id ? (
                          <>
                            <span className="mr-1 text-xs text-faint">Delete?</span>
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
                                className="px-2.5 py-1 text-xs font-medium text-dim hover:bg-line/40"
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
