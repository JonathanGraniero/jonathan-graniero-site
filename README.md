# jonathan-graniero-site

A self-hostable personal site: a blog plus pages about me and my career.

- **Frontend:** React 19, Vite, TanStack Query and Tailwind CSS v4.
- **Backend:** a NestJS 11 API with Prisma 7 on PostgreSQL 17.
- **Shared contract:** one types-only package defines the API contract for both apps.

```
apps/
  api/        NestJS API: posts, tags, profile/career, contact, auth, RSS/sitemap, health
  web/        React SPA: public site + lazy-loaded admin area with markdown editor
packages/
  shared/     API contract types imported by both apps
```

## Quick start

Requires **Node 24** (`nvm use`) and **Docker**.

```bash
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

| Command                           | What it does                                           |
| --------------------------------- | ------------------------------------------------------ |
| `npm run dev`                     | API (watch mode) and web dev server together           |
| `npm run build`                   | Build shared → api → web                               |
| `npm test`                        | API unit tests (Jest) + web tests (Vitest)             |
| `npm run test:e2e`                | API end-to-end tests against the `db-test` container   |
| `npm run lint` / `typecheck`      | ESLint (flat config) / `tsc` across all workspaces     |
| `npm run format`                  | Prettier                                               |
| `npm run db:migrate` / `db:seed`  | Prisma migrations / idempotent seed                    |

The e2e suite truncates every table before it runs. It refuses to run unless `NODE_ENV=test` and the database name ends in `_test`.

## API overview

All routes are prefixed with `/api`.

| Method & path                          | Auth  | Notes                                                        |
| -------------------------------------- | ----- | ------------------------------------------------------------ |
| `GET /posts?page&pageSize&tag&q`       | —     | Published posts. `q` = ranked Postgres full-text, prefix match |
| `GET /posts/:slug`                     | —     | Includes previous/next neighbours                            |
| `GET /tags`                            | —     | Tags with published post counts                              |
| `GET /profile`, `/experience`, `/skills`, `/projects?featured` | — | Career content                                  |
| `POST /contact`                        | —     | Validated, honeypot-protected, 3 req / 10 min per IP         |
| `GET /rss.xml`, `/sitemap.xml`         | —     | Feeds for readers and crawlers                               |
| `GET /health`                          | —     | Terminus DB + heap check                                     |
| `POST /auth/login`, `/auth/logout`, `GET /auth/me` | —/✓ | httpOnly JWT cookie; login limited to 5/min           |
| `GET/POST/PATCH/DELETE /admin/posts[/:id]` | ✓ | Drafts, slug generation, tag upsert, publish timestamps     |
| `PATCH /admin/profile`                 | ✓     | Profile and social links                                     |

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

## Not done yet

Hosting is intentionally out of scope for now. The next step is:

- Production Dockerfiles for the API and web apps.
- A reverse proxy that serves the static web build and forwards `/api`, with TLS.
- `TRUST_PROXY` set so rate limiting sees real client IPs.
- Automated `pg_dump` backups.
