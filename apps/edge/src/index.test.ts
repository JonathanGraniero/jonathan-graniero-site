import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index.ts';

const env: Env = {
  ASSETS: { fetch: vi.fn(async () => new Response('<html>spa</html>')) } as unknown as Fetcher,
  API_ORIGIN: 'https://abc.lambda-url.us-east-2.on.aws',
  ORIGIN_VERIFY_SECRET: 'shh-secret-value',
};

function upstream(response = new Response('{"ok":true}', { status: 200 })) {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

// Test requests lack the edge-populated `cf` metadata; the worker never reads it.
const call = (req: Request) => worker.fetch(req as Parameters<typeof worker.fetch>[0], env);

afterEach(() => vi.unstubAllGlobals());

describe('edge worker', () => {
  it('forwards /api requests to the Lambda origin with the secret header', async () => {
    const spy = upstream();
    const res = await call(
      new Request('https://jonathangraniero.dev/api/posts?tag=go', {
        headers: {
          'cf-connecting-ip': '203.0.113.9',
          'x-forwarded-for': '6.6.6.6',
          cookie: 'access_token=abc',
        },
      }),
    );

    expect(res.status).toBe(200);
    const [url, init] = spy.mock.calls[0]!;
    expect(String(url)).toBe('https://abc.lambda-url.us-east-2.on.aws/api/posts?tag=go');
    const headers = new Headers(init?.headers);
    expect(headers.get('x-origin-verify')).toBe('shh-secret-value');
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.9'); // spoofed value replaced
    expect(headers.get('x-forwarded-proto')).toBe('https');
    expect(headers.get('cookie')).toBe('access_token=abc');
    expect(init?.redirect).toBe('manual');
  });

  it('streams request bodies for writes', async () => {
    const spy = upstream(new Response(null, { status: 201 }));
    await call(
      new Request('https://jonathangraniero.dev/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"name":"Ada"}',
      }),
    );
    const init = spy.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(await new Response(init.body).text()).toBe('{"name":"Ada"}');
  });

  it('passes Set-Cookie and status codes back untouched', async () => {
    upstream(
      new Response('{}', { status: 401, headers: { 'set-cookie': 'access_token=; Max-Age=0' } }),
    );
    const res = await call(new Request('https://jonathangraniero.dev/api/auth/me'));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toContain('access_token=');
  });

  it('returns a JSON 502 when the origin is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('connect ECONNREFUSED'))),
    );
    const res = await call(new Request('https://jonathangraniero.dev/api/health'));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ statusCode: 502, error: 'Bad Gateway' });
  });

  it('serves everything else from static assets', async () => {
    const spy = upstream();
    const res = await call(new Request('https://jonathangraniero.dev/blog/some-post'));
    expect(await res.text()).toBe('<html>spa</html>');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not treat look-alike paths as API routes', async () => {
    const spy = upstream();
    await call(new Request('https://jonathangraniero.dev/apiary'));
    expect(spy).not.toHaveBeenCalled();
  });
});
