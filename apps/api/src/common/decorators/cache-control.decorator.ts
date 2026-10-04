import { SetMetadata } from '@nestjs/common';

export const CACHE_CONTROL_KEY = 'cache-control';

/**
 * Common policies. Public content is cheap to revalidate thanks to Express ETags.
 *
 * `max-age` is for browsers. `s-maxage` is for the Cloudflare edge cache in
 * front of the API (apps/edge), which can hold responses longer because the
 * edge Worker purges it after every admin write.
 */
export const CachePolicy = {
  PublicShort: 'public, max-age=60, s-maxage=3600, stale-while-revalidate=300',
  PublicLong: 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
  NoStore: 'no-store',
} as const;

/** Sets the `Cache-Control` header for a controller or route handler. */
export const CacheControl = (value: string) => SetMetadata(CACHE_CONTROL_KEY, value);
