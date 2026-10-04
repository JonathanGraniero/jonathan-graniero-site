import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { isCacheable, purgeEdgeCache, type Env } from './index.ts';

const env: Env = {
  ASSETS: { fetch: vi.fn(async () => new Response('<html>spa</html>')) } as unknown as Fetcher,
  API_ORIGIN: 'https://abc.lambda-url.us-east-2.on.aws',
  ORIGIN_VERIFY_SECRET: 'shh-secret-value',
  CLOUDFLARE_ZONE_ID: 'zone-123',
  CACHE_PURGE_TOKEN: 'purge-token',
};

function upstream(response = new Response('{"ok":true}', { status: 200 })) {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** Background work handed to ctx.waitUntil, so tests can await it. */
let background: Promise<unknown>[] = [];
const ctx = {
  waitUntil: (p: Promise<unknown>) => void background.push(p),
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

// Test requests lack the edge-populated `cf` metadata; the worker never reads it.
const call = (req: Request, e: Env = env) =>
  worker.fetch(req as Parameters<typeof worker.fetch>[0], e, ctx);

/** The `cf` options the worker passed on its first upstream fetch. */
const cfOptions = (spy: ReturnType<typeof upstream>) =>
  (spy.mock.calls[0]![1] as RequestInit & { cf?: RequestInitCfProperties }).cf;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  background = [];
});

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

describe('edge caching', () => {
  const site = 'https://jonathangraniero.dev';

  it('caches anonymous reads of public API routes', async () => {
    const spy = upstream();
    await call(new Request(`${site}/api/posts?tag=go`));
    expect(cfOptions(spy)).toEqual({ cacheEverything: true });
  });

  it.each([
    [
      'a session cookie',
      new Request(`${site}/api/posts`, { headers: { cookie: 'theme=dark; access_token=abc' } }),
    ],
    [
      'a bearer token',
      new Request(`${site}/api/posts`, { headers: { authorization: 'Bearer abc' } }),
    ],
    ['an admin route', new Request(`${site}/api/admin/posts`)],
    ['an auth route', new Request(`${site}/api/auth/me`)],
    ['the health check', new Request(`${site}/api/health`)],
    ['a write', new Request(`${site}/api/contact`, { method: 'POST', body: '{}' })],
  ])('bypasses the cache for %s', async (_label, request) => {
    const spy = upstream();
    await call(request);
    expect(cfOptions(spy)).toBeUndefined();
  });

  it('ignores cookies other than the session cookie', () => {
    const request = new Request(`${site}/api/tags`, { headers: { cookie: 'not_access_token=1' } });
    expect(isCacheable(request)).toBe(true);
  });

  it('caches HEAD like GET', () => {
    expect(isCacheable(new Request(`${site}/api/profile`, { method: 'HEAD' }))).toBe(true);
  });

  it('purges the zone cache after a successful admin write', async () => {
    const spy = upstream(new Response('{}', { status: 200 }));
    const res = await call(
      new Request(`${site}/api/admin/posts/hello-world`, { method: 'PUT', body: '{}' }),
    );
    expect(res.status).toBe(200);
    await Promise.all(background);

    expect(spy).toHaveBeenCalledTimes(2);
    const [url, init] = spy.mock.calls[1]!;
    expect(String(url)).toBe('https://api.cloudflare.com/client/v4/zones/zone-123/purge_cache');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer purge-token');
    expect(JSON.parse(String(init?.body))).toEqual({ purge_everything: true });
  });

  it.each([
    ['a failed admin write', new Request(`${site}/api/admin/posts`, { method: 'POST' }), 400],
    ['an admin read', new Request(`${site}/api/admin/posts`), 200],
    ['a public write', new Request(`${site}/api/contact`, { method: 'POST' }), 201],
  ])('does not purge after %s', async (_label, request, status) => {
    const spy = upstream(new Response(status === 201 ? null : '{}', { status }));
    await call(request);
    await Promise.all(background);
    expect(background).toHaveLength(0);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('purgeEdgeCache', () => {
  it('skips the purge and warns when no token is configured', async () => {
    const spy = upstream();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await purgeEdgeCache({ ...env, CACHE_PURGE_TOKEN: '' });
    expect(spy).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('CACHE_PURGE_TOKEN'));
  });

  it('logs a rejected purge', async () => {
    upstream(new Response('{"success":false}', { status: 403 }));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await purgeEdgeCache(env);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('403'));
  });

  it('logs a purge that could not be sent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('network down'))),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(purgeEdgeCache(env)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('Edge cache purge failed:', expect.any(Error));
  });
});
