/**
 * Edge entry point for jonathangraniero.dev.
 *
 * Static assets never reach this code (see `assets.run_worker_first` in
 * wrangler.jsonc); only /api/* does. Those requests are forwarded to the
 * NestJS API on AWS Lambda, tagged with a shared secret the API requires, so
 * the Lambda Function URL is useless if called directly.
 *
 * Anonymous reads of public API routes are cached at the edge for as long as
 * the API's `Cache-Control` allows (`s-maxage`). After any successful admin
 * write the zone cache is purged, so edits show up immediately.
 */

export interface Env {
  ASSETS: Fetcher;
  /** Lambda Function URL, e.g. https://abc.lambda-url.us-east-2.on.aws */
  API_ORIGIN: string;
  /** Must match the API's ORIGIN_VERIFY_SECRET. */
  ORIGIN_VERIFY_SECRET: string;
  /** Zone whose cache is purged after admin writes. */
  CLOUDFLARE_ZONE_ID: string;
  /** API token with Zone → Cache Purge on that zone. Purging is skipped when empty. */
  CACHE_PURGE_TOKEN?: string;
}

/** Connection-specific headers that must not be forwarded by a proxy. */
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

/** The API's session cookie (see apps/api/src/auth/auth.constants.ts). */
const SESSION_COOKIE = 'access_token';

/** API routes that are never served from the edge cache. */
const UNCACHED_PREFIXES = ['/api/admin', '/api/auth', '/api/health'];

const isUnder = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const isRead = (request: Request) => request.method === 'GET' || request.method === 'HEAD';

/**
 * Whether a request may be answered from the shared edge cache: an anonymous
 * read of a public API route. The cache key ignores cookies and headers, so
 * anything carrying credentials goes straight to the origin.
 */
export function isCacheable(request: Request): boolean {
  if (!isRead(request)) return false;
  const { pathname } = new URL(request.url);
  if (UNCACHED_PREFIXES.some((prefix) => isUnder(pathname, prefix))) return false;
  if (request.headers.has('authorization')) return false;
  const cookies = request.headers.get('cookie') ?? '';
  return !cookies.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}

/** Whether a completed request changed content, so cached reads may be stale. */
export function isAdminWrite(request: Request, response: Response): boolean {
  return !isRead(request) && isUnder(new URL(request.url).pathname, '/api/admin') && response.ok;
}

export async function proxyToApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) headers.delete(name);
  headers.delete('host'); // fetch() sets Host for the Lambda URL

  // Overwrite (never append) so clients can't spoof their IP for rate limiting.
  const clientIp = request.headers.get('cf-connecting-ip');
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  else headers.delete('x-forwarded-for');
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-forwarded-host', url.host);
  headers.set('x-origin-verify', env.ORIGIN_VERIFY_SECRET);

  const hasBody = !isRead(request);
  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
      // Without this Cloudflare only caches by file extension, so extensionless
      // API paths were never cached. The origin's Cache-Control (s-maxage, or
      // private/no-store) still decides whether and how long.
      cf: isCacheable(request) ? { cacheEverything: true } : undefined,
    });
  } catch {
    return Response.json(
      {
        statusCode: 502,
        error: 'Bad Gateway',
        message: 'The API is temporarily unavailable',
        path: url.pathname,
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}

/**
 * Purges the zone's whole cache. Query strings make it impossible to list
 * every cached API URL, and admin writes are rare, so purging everything is
 * both simpler and complete. Failures are logged; cached reads then expire
 * on their own after `s-maxage`.
 */
export async function purgeEdgeCache(env: Env): Promise<void> {
  if (!env.CACHE_PURGE_TOKEN) {
    console.warn('CACHE_PURGE_TOKEN is not set; edge cache not purged');
    return;
  }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.CACHE_PURGE_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      },
    );
    if (!res.ok) console.error(`Edge cache purge failed: ${res.status} ${await res.text()}`);
  } catch (err) {
    console.error('Edge cache purge failed:', err);
  }
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!isUnder(pathname, '/api')) return env.ASSETS.fetch(request);

    const response = await proxyToApi(request, env);
    if (isAdminWrite(request, response)) ctx.waitUntil(purgeEdgeCache(env));
    return response;
  },
} satisfies ExportedHandler<Env>;
