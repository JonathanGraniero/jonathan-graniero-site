import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Optional here so `prisma generate` (run on install) works without a
    // database configured; migrate/seed still fail loudly if it's missing.
    url: process.env.DATABASE_URL ?? '',
  },
});
