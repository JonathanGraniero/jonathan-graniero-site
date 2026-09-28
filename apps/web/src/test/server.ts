import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { postDetail, posts, profile, projects, tags } from './fixtures.ts';

const apiError = (statusCode: number, message: string) =>
  HttpResponse.json(
    { statusCode, error: 'Error', message, path: '', timestamp: '' },
    { status: statusCode },
  );

/** Default handlers behave like a tiny in-memory version of the real API. */
export const handlers = [
  http.get('/api/posts', ({ request }) => {
    const url = new URL(request.url);
    const tag = url.searchParams.get('tag');
    const q = url.searchParams.get('q')?.toLowerCase();
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 10);
    const filtered = posts.filter(
      (p) =>
        (!tag || p.tags.some((t) => t.slug === tag)) && (!q || p.title.toLowerCase().includes(q)),
    );
    return HttpResponse.json({
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    });
  }),
  http.get('/api/posts/:slug', ({ params }) => {
    const post = postDetail(params.slug as string);
    return post ? HttpResponse.json(post) : apiError(404, 'Post not found');
  }),
  http.get('/api/tags', () => HttpResponse.json(tags)),
  http.get('/api/profile', () => HttpResponse.json(profile)),
  http.get('/api/projects', () => HttpResponse.json(projects)),
  http.get('/api/auth/me', () => apiError(401, 'Authentication required')),
  http.post('/api/contact', () =>
    HttpResponse.json({ id: 'c1', receivedAt: new Date().toISOString() }, { status: 201 }),
  ),
];

export const server = setupServer(...handlers);
export { apiError };
