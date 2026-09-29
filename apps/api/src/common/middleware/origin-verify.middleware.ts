import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const ORIGIN_VERIFY_HEADER = 'x-origin-verify';

/** Paths reachable without the header: the Lambda Web Adapter's local readiness probe. */
const EXEMPT_PATHS = new Set(['/api/health/live']);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Rejects requests that didn't come through CloudFront. CloudFront adds a
 * secret `X-Origin-Verify` header to every origin request; anything hitting
 * the Lambda Function URL directly lacks it and gets a 403.
 */
export function originVerify(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (EXEMPT_PATHS.has(req.path)) return next();
    const header = req.headers[ORIGIN_VERIFY_HEADER];
    if (typeof header === 'string' && safeEqual(header, secret)) return next();
    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Direct access is not allowed',
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  };
}
