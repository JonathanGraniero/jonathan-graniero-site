# jonathan-graniero-site

A self-hostable personal site: a blog plus pages about me and my career.

- **Frontend:** React 19, Vite, TanStack Query and Tailwind CSS v4.
- **Backend:** a NestJS 11 API with Prisma 7 on PostgreSQL 17.
- **Shared contract:** one types-only package defines the API contract for both apps.

```
apps/
  api/          NestJS API: posts, tags, profile/career, contact, auth, RSS/sitemap, health
  web/          React SPA: public site + lazy-loaded admin area with markdown editor
  edge/         Cloudflare Worker: serves web's build, proxies /api/* to the API
  kflare-site/  kflare.dev, the kflare project site and its docs: pre-rendered React
packages/
  shared/       API contract types imported by both apps
```

## Prerequisites

- **Node 24+**, pinned in `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm), run `nvm install && nvm use`. Your shell must load nvm (the `NVM_DIR` / `nvm.sh` lines in `~/.zshrc` or `~/.bashrc`). If `node -v` still shows an old version, it probably doesn't. Running a script on an older Node fails right away with a message explaining this.
- **Docker** (for Postgres).

## Quick start

```bash
nvm use
npm install
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET and ADMIN_* values
npm run db:up                            # Postgres (dev :5432, test :5433)
npm run db:migrate                       # apply migrations
npm run db:seed                          # stub profile, career, projects, posts + admin user
npm run dev                              # API on :3000, web on :5173
```

Once it's running:

- **Site:** http://localhost:5173
- **Admin:** http://localhost:5173/admin. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values from `apps/api/.env`.
- **API docs (Swagger):** http://localhost:3000/docs. The OpenAPI JSON is at `/docs/openapi.json`.

In development, Vite proxies `/api` to the Nest server, so the browser only ever talks to one origin. The same setup applies behind a reverse proxy in production.

## Scripts

| Command                          | What it does                                                     |
| -------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                    | API (watch mode) and web dev server together                     |
| `npm run build`                  | Build shared → api → web → kflare-site                           |
| `npm test`                       | API unit tests (Jest) + web, edge and kflare-site tests (Vitest) |
| `npm run test:e2e`               | API end-to-end tests against the `db-test` container             |
| `npm run lint` / `typecheck`     | ESLint (flat config) / `tsc` across all workspaces               |
| `npm run format`                 | Prettier                                                         |
| `npm run db:migrate` / `db:seed` | Prisma migrations / idempotent seed                              |

The e2e suite truncates every table before it runs. It refuses to run unless `NODE_ENV=test` and the database name ends in `_test`.

## API overview

All routes are prefixed with `/api`.

| Method & path                                                  | Auth | Notes                                                          |
| -------------------------------------------------------------- | ---- | -------------------------------------------------------------- |
| `GET /posts?page&pageSize&tag&q`                               | —    | Published posts. `q` = ranked Postgres full-text, prefix match |
| `GET /posts/:slug`                                             | —    | Includes previous/next neighbours                              |
| `GET /tags`                                                    | —    | Tags with published post counts                                |
| `GET /profile`, `/experience`, `/skills`, `/projects?featured` | —    | Career content                                                 |
| `POST /contact`                                                | —    | Validated, honeypot-protected, 3 req / 10 min per IP           |
| `GET /rss.xml`, `/sitemap.xml`                                 | —    | Feeds for readers and crawlers                                 |
| `GET /health`                                                  | —    | Terminus DB + heap check                                       |
| `POST /auth/login`, `/auth/logout`, `GET /auth/me`             | —/✓  | httpOnly JWT cookie; login limited to 5/min                    |
| `GET/POST/PATCH/DELETE /admin/posts[/:id]`                     | ✓    | Drafts, slug generation, tag upsert, publish timestamps        |
| `PATCH /admin/profile`                                         | ✓    | Profile and social links                                       |

## Design notes

### Backend

- **One contract, two consumers.** DTOs `implement` the shared input types. Services map Prisma rows to the shared output types, so `Date` objects and internal columns never leak into responses. Renaming a field breaks the compile in both apps.
- **Errors have a single shape.** A global filter converts `HttpException`s and Prisma errors (`P2002` → 409 with the field name, `P2025` → 404) into the shared `ApiError` shape. Unknown errors become opaque 500s.
- **Env is validated at boot** with zod. A bad deploy fails immediately with a readable message.
- **Security:**
  - helmet security headers.
  - CORS locked to `WEB_ORIGIN`.
  - Strict validation (`whitelist` + `forbidNonWhitelisted`).
  - argon2 password hashing. Login costs the same whether or not the email exists, so response timing can't be used to discover accounts.
  - httpOnly, `SameSite=Lax` session cookie, marked `Secure` in production.
  - Throttling on login and on the contact form.
- **Caching.** Public GET routes send `Cache-Control` headers, and Express ETags make revalidation cheap (304s). Admin responses are `no-store`.
- **Search** uses a GIN expression index (see the `post_search` migration) with `ts_rank` ordering. User input is reduced to bound prefix terms (`kube:* & contr:*`), so it can't alter the query.

### Frontend

- **State in the URL.** Blog filters, search and pagination live in the query string: filtered views are shareable and back/forward works.
- **Loading and caching.** Each post is prefetched on hover or focus. Pages keep showing the previous results while a new page or filter loads.
- **Code splitting.** Every route except the home page is lazy-loaded, so markdown rendering, form validation and the whole admin area load only when needed. Syntax highlighting uses a fine-grained Shiki build (16 grammars, pure-JS regex engine, no WASM) that loads the first time a code block renders.
- **Safe markdown.** Raw HTML in markdown is never rendered.
- **Admin editor:**
  - Split-pane editor with a live preview (`useDeferredValue` keeps typing smooth).
  - ⌘/Ctrl+S saves.
  - Unsaved-changes guard, both for in-app navigation (`useBlocker`) and for closing the tab.
  - Optimistic publish/unpublish and delete, with rollback if the request fails.
- **Accessibility:**
  - Skip link and semantic landmarks.
  - Labelled form errors (`aria-invalid` / `aria-describedby`).
  - Accessible toggle and pagination controls.
  - Respects `prefers-reduced-motion`.
  - Light, dark or system theme, applied before first paint so there's no flash.

## Content

The seed only **inserts** content, so anything edited through `/admin` survives a re-seed.

- **Profile and career:** placeholders in `apps/api/prisma/seed.ts`.
- **Sample posts:** `apps/api/prisma/seed-data/posts.ts`.

## Deployment

Production is **hybrid** and costs about **$12/yr** (just the domain):

- **Edge (Cloudflare):** a Worker ([`apps/edge`](apps/edge)) on `jonathangraniero.dev` serves the React build as free static assets, and proxies `/api/*` to AWS with a shared-secret header.
- **API (AWS):** runs on Lambda through the Lambda Web Adapter, so NestJS runs unchanged. Direct calls to its URL get a 403.
- **Database:** Postgres on Neon's free tier.

Everything is declarative:

- **Terraform** in [`infra/`](infra/README.md) covers AWS plus Cloudflare zone settings, redirects and rate limiting.
- **[`wrangler.jsonc`](apps/edge/wrangler.jsonc)** covers the Worker, its assets and its custom domain.
- **Deploys:** after CI passes on `main`, [`deploy.yml`](.github/workflows/deploy.yml) ships both, using GitHub OIDC so there are no stored AWS keys.

The API package is traced from `dist/main.js` by [`scripts/package-api.sh`](scripts/package-api.sh), so only files that are actually loaded ship: about 19 MB unzipped.

### kflare.dev

[`apps/kflare-site`](apps/kflare-site) is pre-rendered to static HTML at build time, so every page reads in full without JavaScript. The home page is then hydrated; the docs pages stay static, with a few lines of script for their copy buttons. A Worker with no script serves it all from [`wrangler.jsonc`](apps/kflare-site/wrangler.jsonc). [`infra/kflare`](infra/kflare) creates the token that [`deploy-kflare.yml`](.github/workflows/deploy-kflare.yml) deploys it with after CI passes. See [infra/README.md](infra/README.md#kflaredev).

The site follows kflare with no edits here. [`scripts/fetch-kflare.mjs`](apps/kflare-site/scripts/fetch-kflare.mjs) fetches from GitHub, into `apps/kflare-site/kflare/` (not committed):

- **The latest published release**: its CRDs, samples and guides, which `/docs/` is built from (a reference page per kind, with an example that shows every field, and the deploy guide and ARCHITECTURE.md from their markdown), and from its README and chart, the version, requirements and resource kinds on the home page.
- **main's CHANGELOG.md and ROADMAP.md**: the changes since that release, under "In the next release", and the roadmap's "Next" and the kinds' areas.

[`src/release/digest.ts`](apps/kflare-site/src/release/digest.ts) reads them, so kflare's docs keep a few conventions: each kind has a row in README.md's "Resource kinds" table and an area in ROADMAP.md's "Done" table (a kind missing from either is still listed, with a warning in the build), each change in CHANGELOG.md opens with a bold sentence, and each release has its `## vX.Y.Z` section. CI and deploys fetch first, and [`watch-kflare.yml`](.github/workflows/watch-kflare.yml) redeploys the site within the hour of a release or a change to either file (see [infra/README.md](infra/README.md#deploying-and-verifying)).

```bash
npm run fetch-kflare -w @site/kflare-site   # build, test and dev fetch only when kflare/ is missing
```

`npm run build -w @site/kflare-site` and `npx wrangler dev` in `apps/kflare-site` preview it; the Vite dev server shows only the home page.
