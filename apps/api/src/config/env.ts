import { z } from 'zod';

/**
 * Environment contract, validated once at boot. A misconfigured deploy fails
 * fast with a readable error instead of misbehaving at runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  WEB_ORIGIN: z.url(),
  SITE_URL: z.url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  /** Express "trust proxy" setting; set when running behind a reverse proxy. */
  TRUST_PROXY: z.string().optional(),
  /**
   * Shared secret CloudFront adds as `X-Origin-Verify`. When set, requests
   * without it are rejected, so the Lambda URL can't be hit directly.
   */
  ORIGIN_VERIFY_SECRET: z.string().min(16).optional(),
  /** Max Postgres connections per process (keep small on Lambda). */
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  /** Serve Swagger UI at /docs. Defaults to on outside production. */
  SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
