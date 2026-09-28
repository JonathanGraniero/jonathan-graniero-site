import { SetMetadata } from '@nestjs/common';

export const CACHE_CONTROL_KEY = 'cache-control';

/** Common policies. Public content is cheap to revalidate thanks to Express ETags. */
export const CachePolicy = {
  PublicShort: 'public, max-age=60, stale-while-revalidate=300',
  PublicLong: 'public, max-age=3600, stale-while-revalidate=86400',
  NoStore: 'no-store',
} as const;

/** Sets the `Cache-Control` header for a controller or route handler. */
export const CacheControl = (value: string) => SetMetadata(CACHE_CONTROL_KEY, value);
