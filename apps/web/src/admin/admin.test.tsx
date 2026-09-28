import { screen, waitFor } from '@testing-library/react';
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
