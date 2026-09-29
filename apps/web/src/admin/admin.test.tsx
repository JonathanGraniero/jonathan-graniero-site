import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/render.tsx';
import { server } from '../test/server.ts';

const signedIn = () =>
  server.use(
    http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'admin@example.com' })),
    http.get('/api/admin/posts', () =>
      HttpResponse.json({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }),
    ),
    http.get('/api/admin/messages/stats', () => HttpResponse.json({ total: 0, unread: 0 })),
  );

describe('admin', () => {
  it('redirects anonymous users to login, preserving the destination', async () => {
    const { router } = renderRoute('/admin/posts/new');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/login');
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/admin/posts/new')}`);
  });

  it('logs in and returns to the requested page', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ id: 'u1', email: 'admin@example.com' }),
      ),
    );
    const { router, user } = renderRoute('/admin/login?next=%2Fadmin%2Fprofile');

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'super-secret');
    signedIn();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/profile'));
  });

  it('ignores off-site redirect targets after login', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ id: 'u1', email: 'admin@example.com' }),
      ),
    );
    const { router, user } = renderRoute('/admin/login?next=https%3A%2F%2Fevil.example');

    await user.type(await screen.findByLabelText('Email'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'super-secret');
    signedIn();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });

  it('live-previews markdown in the post editor', async () => {
    signedIn();
    const { user } = renderRoute('/admin/posts/new');

    const editor = await screen.findByLabelText('Content (markdown)');
    await user.type(editor, '## Hello preview');

    const preview = screen.getByRole('region', { name: 'Preview' });
    await waitFor(() => expect(preview.querySelector('h2')).toHaveTextContent('Hello preview'));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('creates a post and navigates to its edit URL', async () => {
    signedIn();
    let created: Record<string, unknown> | undefined;
    server.use(
      http.post('/api/admin/posts', async ({ request }) => {
        created = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...created,
          id: 'new1',
          slug: 'my-title',
          tags: [{ slug: 'go', name: 'Go' }],
          publishedAt: null,
          readingTimeMin: 1,
          createdAt: '',
          updatedAt: '',
          previous: null,
          next: null,
        });
      }),
    );
    const { router, user } = renderRoute('/admin/posts/new');

    await user.type(await screen.findByLabelText('Title'), 'My title');
    await user.type(screen.getByLabelText('Excerpt'), 'Short summary');
    await user.type(screen.getByLabelText('Add tag'), 'Go{Enter}');
    await user.type(screen.getByLabelText('Content (markdown)'), 'Body text');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/posts/new1'));
    expect(created).toMatchObject({
      title: 'My title',
      tags: ['Go'],
      status: 'DRAFT',
      coverImage: null,
    });
    expect(created).not.toHaveProperty('slug');
  });
});

describe('post editor unsaved-changes guard', () => {
  it('asks before discarding edits', async () => {
    signedIn();
    const { router, user } = renderRoute('/admin/posts/new');

    await user.type(await screen.findByLabelText('Title'), 'Half-written');
    await user.click(screen.getByRole('link', { name: '← Posts' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('You have unsaved changes.');
    expect(router.state.location.pathname).toBe('/admin/posts/new');

    await user.click(screen.getByRole('button', { name: /Discard/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'));
  });
});

describe('admin messages inbox', () => {
  const inbox = () => {
    const messages = [
      {
        id: 'm1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        message: 'Loved the kflare post!\nMore please.',
        createdAt: '2026-09-28T10:00:00Z',
        readAt: null,
      },
      {
        id: 'm2',
        name: 'Grace Hopper',
        email: 'grace@example.com',
        message: 'Old news.',
        createdAt: '2026-09-20T10:00:00Z',
        readAt: '2026-09-21T10:00:00Z',
      },
    ];
    const calls: { method: string; id: string; body?: unknown }[] = [];
    signedIn();
    server.use(
      http.get('/api/admin/messages/stats', () =>
        HttpResponse.json({
          total: messages.length,
          unread: messages.filter((m) => !m.readAt).length,
        }),
      ),
      http.get('/api/admin/messages', ({ request }) => {
        const unread = new URL(request.url).searchParams.get('unread') === 'true';
        const items = messages.filter((m) => !unread || !m.readAt);
        return HttpResponse.json({
          items,
          page: 1,
          pageSize: 20,
          total: items.length,
          totalPages: 1,
        });
      }),
      http.patch('/api/admin/messages/:id', async ({ params, request }) => {
        const body = (await request.json()) as { read: boolean };
        calls.push({ method: 'PATCH', id: params.id as string, body });
        const m = messages.find((x) => x.id === params.id)!;
        m.readAt = body.read ? (m.readAt ?? new Date().toISOString()) : null;
        return HttpResponse.json(m);
      }),
      http.delete('/api/admin/messages/:id', ({ params }) => {
        calls.push({ method: 'DELETE', id: params.id as string });
        messages.splice(
          messages.findIndex((x) => x.id === params.id),
          1,
        );
        return new HttpResponse(null, { status: 204 });
      }),
    );
    return calls;
  };

  it('shows the unread badge and lists messages newest first', async () => {
    inbox();
    renderRoute('/admin/messages');
    expect(await screen.findByLabelText('1 unread')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Messages' });
    const rows = within(list).getAllByRole('button', { expanded: false });
    expect(rows[0]).toHaveTextContent('Ada Lovelace');
    expect(rows[1]).toHaveTextContent('Grace Hopper');
    expect(screen.getByText('1 unread · 2 total')).toBeInTheDocument();
  });

  it('opening an unread message marks it read and offers a reply link', async () => {
    const calls = inbox();
    const { user } = renderRoute('/admin/messages');
    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }));

    await waitFor(() =>
      expect(calls).toContainEqual({ method: 'PATCH', id: 'm1', body: { read: true } }),
    );
    expect(screen.getByText(/More please\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reply' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^mailto:ada@example\.com\?subject=/),
    );
    await waitFor(() => expect(screen.queryByLabelText('1 unread')).not.toBeInTheDocument());
  });

  it('filters to unread only', async () => {
    inbox();
    const { router, user } = renderRoute('/admin/messages');
    await user.click(await screen.findByRole('tab', { name: 'Unread' }));
    await waitFor(() => expect(router.state.location.search).toBe('?filter=unread'));
    await waitFor(() => expect(screen.queryByText(/Grace Hopper/)).not.toBeInTheDocument());
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it('deletes after confirmation', async () => {
    const calls = inbox();
    const { user } = renderRoute('/admin/messages');
    await user.click(await screen.findByRole('button', { name: /Grace Hopper/ }));
    await user.click(screen.getByRole('button', { name: 'Delete message from Grace Hopper' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', id: 'm2' }));
    await waitFor(() => expect(screen.queryByText(/Grace Hopper/)).not.toBeInTheDocument());
  });
});
