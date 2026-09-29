/**
 * Edge entry point for jonathangraniero.dev.
 *
 * Static assets never reach this code (see `assets.run_worker_first` in
 * wrangler.jsonc); only /api/* does. Those requests are forwarded to the
 * NestJS API on AWS Lambda, tagged with a shared secret the API requires, so
 * the Lambda Function URL is useless if called directly.
 */

export interface Env {
  ASSETS: Fetcher;
  /** Lambda Function URL, e.g. https://abc.lambda-url.us-east-2.on.aws */
  API_ORIGIN: string;
  /** Must match the API's ORIGIN_VERIFY_SECRET. */
  ORIGIN_VERIFY_SECRET: string;
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

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  try {
    return await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
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

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return proxyToApi(request, env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
