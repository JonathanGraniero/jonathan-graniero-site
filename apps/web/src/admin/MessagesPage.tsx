import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ContactMessage, MessageStats, Paginated } from '@site/shared';
import clsx from 'clsx';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Pagination } from '../components/Pagination.tsx';
import { Button, Container, EmptyState, ErrorState, Skeleton } from '../components/ui.tsx';
import { api } from '../lib/api.ts';
import { age, formatDate } from '../lib/format.ts';
import { queries } from '../lib/queries.ts';

const PAGE_SIZE = 20;

type ListSnapshot = [QueryKey, Paginated<ContactMessage> | undefined][];

/**
 * Optimistic mutation over every cached inbox page plus the unread counter,
 * rolled back if the request fails.
 */
function useInboxMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (items: ContactMessage[], vars: TVars) => ContactMessage[],
  unreadDelta: (items: ContactMessage[], vars: TVars) => number,
) {
  const queryClient = useQueryClient();
  const listKey = ['admin', 'messages', 'list'];
  const statsKey = queries.messageStats().queryKey;
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'messages'] });
      const lists: ListSnapshot = queryClient.getQueriesData<Paginated<ContactMessage>>({
        queryKey: listKey,
      });
      const stats = queryClient.getQueryData<MessageStats>(statsKey);
      const current = lists.flatMap(([, page]) => page?.items ?? []);
      const delta = unreadDelta(current, vars);
      queryClient.setQueriesData<Paginated<ContactMessage>>({ queryKey: listKey }, (old) =>
        old ? { ...old, items: apply(old.items, vars) } : old,
      );
      if (stats)
        queryClient.setQueryData(statsKey, { ...stats, unread: Math.max(0, stats.unread + delta) });
      return { lists, stats };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.lists.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (ctx?.stats) queryClient.setQueryData(statsKey, ctx.stats);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] }),
  });
}

const findMessage = (items: ContactMessage[], id: string) => items.find((m) => m.id === id);

export function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const unreadOnly = params.get('filter') === 'unread';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const messages = useQuery(
    queries.adminMessages({ page, pageSize: PAGE_SIZE, unread: unreadOnly || undefined }),
  );
  const stats = useQuery(queries.messageStats());

  const setRead = useInboxMutation(
    ({ id, read }: { id: string; read: boolean }) => api.admin.messages.setRead(id, read),
    (items, { id, read }) =>
      items.map((m) =>
        m.id === id ? { ...m, readAt: read ? (m.readAt ?? new Date().toISOString()) : null } : m,
      ),
    (items, { id, read }) => {
      const m = findMessage(items, id);
      if (!m || Boolean(m.readAt) === read) return 0;
      return read ? -1 : 1;
    },
  );
  const remove = useInboxMutation(
    (id: string) => api.admin.messages.remove(id),
    (items, id) => items.filter((m) => m.id !== id),
    (items, id) => (findMessage(items, id)?.readAt ? 0 : -1),
  );

  const setFilter = (unread: boolean) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (unread) next.set('filter', 'unread');
      else next.delete('filter');
      next.delete('page');
      return next;
    });

  const toggle = (m: ContactMessage) => {
    const opening = openId !== m.id;
    setOpenId(opening ? m.id : null);
    setConfirmDelete(null);
    if (opening && !m.readAt) setRead.mutate({ id: m.id, read: true });
  };

  return (
    <Container className="max-w-4xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          {stats.data && (
            <p className="mt-1 text-sm text-dim">
              {stats.data.unread} unread · {stats.data.total} total
            </p>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Filter messages"
          className="inline-flex border border-line bg-panel p-0.5"
        >
          {[
            { label: 'All', value: false },
            { label: 'Unread', value: true },
          ].map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={unreadOnly === f.value}
              onClick={() => setFilter(f.value)}
              className={clsx(
                'px-3 py-1 text-sm font-medium transition',
                unreadOnly === f.value ? 'bg-ink text-bg' : 'text-dim hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(setRead.isError || remove.isError) && (
        <p role="alert" className="mt-4 border border-err/50 px-4 py-2 text-sm text-err">
          {(setRead.error ?? remove.error)?.message}. Changes were rolled back.
        </p>
      )}

      <div className="mt-6">
        {messages.isPending ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
        ) : messages.data.items.length === 0 ? (
          <EmptyState title={unreadOnly ? 'No unread messages.' : 'No messages yet.'}>
            Submissions from the contact form show up here.
          </EmptyState>
        ) : (
          <ul className="border border-line bg-panel" aria-label="Messages">
            {messages.data.items.map((m) => {
              const open = openId === m.id;
              const unread = !m.readAt;
              return (
                <li key={m.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => toggle(m)}
                    aria-expanded={open}
                    aria-controls={`message-${m.id}`}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-line/20"
                  >
                    <span
                      aria-label={unread ? 'Unread' : 'Read'}
                      className={clsx(
                        'mt-1.5 size-2 shrink-0',
                        unread ? 'bg-signal' : 'bg-transparent',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span
                          className={clsx(
                            'truncate',
                            unread ? 'font-semibold text-ink' : 'text-dim',
                          )}
                        >
                          {m.name} <span className="font-normal text-faint">&lt;{m.email}&gt;</span>
                        </span>
                        <time
                          dateTime={m.createdAt}
                          title={formatDate(m.createdAt)}
                          className="shrink-0 text-xs text-faint"
                        >
                          {age(m.createdAt)} ago
                        </time>
                      </span>
                      {!open && (
                        <span className="mt-1 line-clamp-2 block text-sm text-dim">
                          {m.message}
                        </span>
                      )}
                    </span>
                  </button>

                  {open && (
                    <div id={`message-${m.id}`} className="border-t border-line/60 px-4 pb-4 pl-9">
                      <p className="pt-3 font-serif text-base leading-relaxed whitespace-pre-wrap text-ink">
                        {m.message}
                      </p>
                      <p className="mt-3 text-xs text-faint">Received {formatDate(m.createdAt)}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                          href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message on jonathangraniero.dev')}`}
                          className="inline-flex items-center border border-signal bg-signal px-3 py-1.5 text-xs font-medium tracking-wider text-signal-ink uppercase"
                        >
                          Reply
                        </a>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5"
                          onClick={() => setRead.mutate({ id: m.id, read: unread })}
                        >
                          Mark {unread ? 'read' : 'unread'}
                        </Button>
                        {confirmDelete === m.id ? (
                          <>
                            <span className="ml-2 text-xs text-dim">Delete for good?</span>
                            <Button
                              variant="danger"
                              className="px-3 py-1.5"
                              onClick={() => {
                                remove.mutate(m.id);
                                setConfirmDelete(null);
                                setOpenId(null);
                              }}
                            >
                              Delete
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-3 py-1.5"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="dangerGhost"
                            className="px-3 py-1.5"
                            onClick={() => setConfirmDelete(m.id)}
                            aria-label={`Delete message from ${m.name}`}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {messages.data && (
        <Pagination
          page={messages.data.page}
          totalPages={messages.data.totalPages}
          onChange={(p) =>
            setParams((prev) => {
              const next = new URLSearchParams(prev);
              if (p > 1) next.set('page', String(p));
              else next.delete('page');
              return next;
            })
          }
        />
      )}
    </Container>
  );
}
