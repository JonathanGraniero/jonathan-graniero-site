# Infrastructure

The production setup is **hybrid**: Cloudflare runs the edge, and AWS runs the API. It costs **$12.20/yr** (the domain). Everything else fits in free tiers.

```
jonathangraniero.dev ──► Cloudflare Worker "jonathan-graniero-site"  (apps/edge)
                           ├─ /*      → static assets: the React build (free, unlimited)
                           └─ /api/*  → edge cache (anonymous public reads) → AWS Lambda Function URL (+ X-Origin-Verify secret)
                                          └─ NestJS via Lambda Web Adapter → Neon Postgres
www.jonathangraniero.dev ─► 301 to the apex (Cloudflare redirect rule)
```

## Who owns what (all declarative, in this repo)

| Piece                                                                      | Defined in                                                | Applied by                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| Worker script, static assets, apex custom domain (DNS + certificate), vars | [`apps/edge/wrangler.jsonc`](../apps/edge/wrangler.jsonc) | `wrangler deploy` (CI)                           |
| Worker secrets `ORIGIN_VERIFY_SECRET`, `CACHE_PURGE_TOKEN`                 | SSM `/site/prod/<name>`                                   | CI: `wrangler deploy --secrets-file`             |
| Cloudflare zone settings (HTTPS, TLS), www redirect, rate limiting         | [`prod/cloudflare.tf`](prod/cloudflare.tf)                | Terraform                                        |
| Lambda, Function URL, artifact/backup buckets, budgets, deploy IAM         | [`prod/`](prod/)                                          | Terraform                                        |
| Terraform state bucket, GitHub OIDC provider, deploy role                  | [`bootstrap/`](bootstrap/)                                | Terraform (once, local state)                    |
| Database schema                                                            | `apps/api/prisma/migrations`                              | CI: `prisma migrate deploy`                      |
| API code                                                                   | `apps/api`                                                | CI: packaged zip → `lambda update-function-code` |

## Accounts and secrets

- **Domain:** `jonathangraniero.dev` via Cloudflare Registrar. The zone is on Cloudflare.
- **Neon:** project `personal-site` (`holy-cloud-59526452`, aws-us-east-2), database `neondb`.
- **SSM (us-east-2), all SecureString:**
  - `/site/prod/DATABASE_URL` (Neon pooled)
  - `/site/prod/JWT_SECRET`
  - `/site/prod/ORIGIN_VERIFY_SECRET`
  - `/site/prod/CACHE_PURGE_TOKEN` (see the `jg-site-cache-purge` token below)
  - `/site/prod/ADMIN_PASSWORD`
- **GitHub `production` environment secrets:**
  - `NEON_DIRECT_URL`: migrations and backups
  - `CLOUDFLARE_API_TOKEN`: CI token, see below
- **GitHub repository variables:**

  | Variable                | Value                                           |
  | ----------------------- | ----------------------------------------------- |
  | `AWS_DEPLOY_ROLE_ARN`   | `arn:aws:iam::623805552183:role/gh-deploy-site` |
  | `CLOUDFLARE_ACCOUNT_ID` | the Cloudflare account ID                       |
  | `ARTIFACTS_BUCKET`      | `terraform output artifacts_bucket`             |
  | `BACKUPS_BUCKET`        | `terraform output backups_bucket`               |
  | `LAMBDA_FUNCTION_NAME`  | `terraform output lambda_function_name`         |
  | `SITE_URL`              | `https://jonathangraniero.dev`                  |

### Cloudflare API tokens

Three narrowly scoped tokens were minted for this project, so no personal or broad token is used in automation:

| Token                 | Scope                                                                                                     | Stored in                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `jg-site-terraform`   | Zone `jonathangraniero.dev`: Zone Settings, Dynamic URL Redirects, Zone WAF, DNS (write) and Zone (read)  | SSM `/site/prod/CLOUDFLARE_TERRAFORM_TOKEN`                                                      |
| `jg-site-ci-deploy`   | Account: Workers Scripts (write). Zone: Workers Routes, DNS, SSL and Certificates (write) and Zone (read) | GitHub `production` secret `CLOUDFLARE_API_TOKEN` (copy in SSM `/site/prod/CLOUDFLARE_CI_TOKEN`) |
| `jg-site-cache-purge` | Zone `jonathangraniero.dev`: Cache Purge                                                                  | SSM `/site/prod/CACHE_PURGE_TOKEN` (uploaded to the Worker by CI)                                |

### Edge caching of the API

Cloudflare only caches by file extension, so `/api/*` responses were never cached even though the API sends `Cache-Control: public`. The Worker now forwards anonymous `GET`/`HEAD` requests for public routes with `cf.cacheEverything`, which makes the edge honour the API's `Cache-Control`: browsers keep `max-age`, the edge keeps `s-maxage` (1 hour for posts, profile and tags; 1 day for the feed and sitemap).

- Never cached: requests with the `access_token` cookie or an `Authorization` header, `/api/admin/*`, `/api/auth/*`, `/api/health`, writes, and any response marked `private` or `no-store`.
- After every successful write to `/api/admin/*`, the Worker purges the zone cache in the background, so edits appear immediately. If the purge fails it is logged in Workers Observability, and cached reads expire after `s-maxage`.
- Check it with `curl -sI https://jonathangraniero.dev/api/posts | grep -i cf-cache-status`: `MISS` on the first request in a region, then `HIT`.

## Applying Terraform

```bash
# once
cd infra/bootstrap && terraform init && terraform apply

# production
cd infra/prod
cp terraform.tfvars.example terraform.tfvars          # alert_email
export CLOUDFLARE_API_TOKEN="$(aws ssm get-parameter --name /site/prod/CLOUDFLARE_TERRAFORM_TOKEN --with-decryption --query Parameter.Value --output text)"
terraform init -backend-config="bucket=jg-site-tfstate-623805552183"
terraform apply
```

## Deploying

Pushing to `main` runs CI. When it passes, [`deploy.yml`](../.github/workflows/deploy.yml) runs these steps:

1. **API:** runs on an arm64 runner. Migrates Neon, packages the API (traced, about 19 MB), and updates the Lambda.
2. **Edge:** builds the web app, pulls the origin secret from SSM, and runs `wrangler deploy`.
3. **Smoke test:** checks `/api/health`, a deep link, and the www → apex 301.

You can also run it manually from **Actions → Deploy → Run workflow**.

### Seeding a fresh database

```bash
DATABASE_URL='<neon direct url>' ADMIN_EMAIL='…' \
ADMIN_PASSWORD="$(aws ssm get-parameter --name /site/prod/ADMIN_PASSWORD --with-decryption --query Parameter.Value --output text)" \
npm run db:seed
```

## Verify

```bash
curl -s https://jonathangraniero.dev/api/health                       # {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' \
  "$(terraform -chdir=infra/prod output -raw lambda_function_url)api/posts"   # 403 (not via the Worker)
curl -sI https://www.jonathangraniero.dev/about | grep -i location   # https://jonathangraniero.dev/about
```

## Operations

- **Logs:**
  - Worker: Cloudflare dashboard → Workers → Observability.
  - API: CloudWatch log group `/aws/lambda/jg-site-api` (14-day retention).
- **Backups:** the weekly [`backup.yml`](../.github/workflows/backup.yml) workflow writes `pg_dump` to the backups bucket, kept for 90 days.
- **Guardrails:**
  - An AWS Budget emails at $2 (actual) and $5 (forecast).
  - A Cloudflare rate-limit rule covers login and contact.
  - The API also throttles requests itself.
- **Limits:**
  - The Workers free plan allows 100k requests/day, but only `/api/*` invokes the Worker; static assets are free.
  - The Lambda account concurrency limit is 10.
- **Cold starts:** after about 5 idle minutes, the first API request pays for a Lambda cold start plus Neon resuming, usually 1–3s.
- **Local `wrangler dev`:** `workerd` needs glibc 2.32+. On older distros (Debian 11/WSL), run it in Docker:

  ```bash
  docker run --rm --network host -v "$PWD":/repo -w /repo/apps/edge node:24-bookworm \
    npx wrangler dev --var API_ORIGIN:http://localhost:3000 --var ORIGIN_VERIFY_SECRET:dev
  ```

## kflare.dev

[kflare.dev](https://kflare.dev) is the project site for [kflare](https://github.com/JonathanGraniero/kflare), with its docs: pre-rendered React ([`apps/kflare-site`](../apps/kflare-site)) served as static Worker assets, in the same Cloudflare account. It costs nothing beyond its domain, which is registered with Cloudflare Registrar.

```
kflare.dev, www.kflare.dev ──► Cloudflare Worker "kflare-site"  (apps/kflare-site)
                                 └─ static assets only: index.html, docs/**/index.html, 404.html, hashed JS/CSS/fonts (free, unmetered)
```

| Piece                                                                  | Defined in                                                                | Applied by             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| Worker, static assets, custom domains (DNS + certificates)             | [`apps/kflare-site/wrangler.jsonc`](../apps/kflare-site/wrangler.jsonc)   | `wrangler deploy` (CI) |
| Security and cache headers                                             | [`apps/kflare-site/public/_headers`](../apps/kflare-site/public/_headers) | `wrangler deploy` (CI) |
| CI token `kflare-site-ci-deploy`, its SSM copy, the deploy role's read | [`kflare/`](kflare/)                                                      | Terraform              |
| Email Routing (MX, SPF and DKIM records, addresses)                    | Cloudflare dashboard                                                      | By hand                |

### Shared with kflare's live tests

kflare's live e2e suite runs against the kflare.dev zone. It creates and deletes DNS records, Worker routes and rules in every ruleset phase, and turns managed transforms on and off. Its hostnames and paths never touch the site's, but anything zone-wide would collide, so:

- **No zone settings or rulesets in Terraform.** The suite expects every managed transform to be off when it starts, deletes the managed phase's entry point, and uses the one rate limiting rule a Free zone allows. kflare's planned `ZoneSettings` kind will be tested on this zone too. The zone keeps Cloudflare's defaults (Automatic SSL/TLS), and the site sends its own headers. `.dev` is on the HSTS preload list, so browsers only ever use HTTPS.
- **www is a second custom domain** rather than a redirect rule. Both hosts serve the same page, whose canonical URL is the apex.

Move the suite to a zone of its own before managing more of kflare.dev here.

### Token

| Token                   | Scope                                                                                                               | Stored in                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `kflare-site-ci-deploy` | Account: Workers Scripts (write). Zone `kflare.dev`: Workers Routes, DNS, SSL and Certificates (write), Zone (read) | SSM `/site/kflare/CLOUDFLARE_CI_TOKEN`, written by Terraform |

The deploy job reads it through the existing OIDC role, so GitHub stores nothing new. Rotate it with `terraform apply -replace=cloudflare_account_token.ci_deploy`.

### Applying Terraform

The stack creates an API token, so it runs with a Cloudflare token that can create account API tokens (Account API Tokens: Edit) and read the kflare.dev zone, such as your own. Like `bootstrap/`, it's applied locally.

```bash
cd infra/kflare
export CLOUDFLARE_API_TOKEN=...   # Account API Tokens: Edit, Zone: Read on kflare.dev
terraform init -backend-config="bucket=jg-site-tfstate-623805552183"
terraform apply
```

### Deploying and verifying

[`deploy-kflare.yml`](../.github/workflows/deploy-kflare.yml) runs after CI passes on a push to `main`, when [`watch-kflare.yml`](../.github/workflows/watch-kflare.yml) finds that kflare has changed, or from **Actions → Deploy kflare.dev → Run workflow**. It fetches kflare's latest release, CHANGELOG and ROADMAP from GitHub, builds the site, reads the token from SSM, runs `wrangler deploy`, then checks the page, its CSP header, the 404, www, and that `/source.json` is this build's.

Every hour, `watch-kflare.yml` compares the release, CHANGELOG and ROADMAP that `/source.json` names with GitHub's, and when they differ, redeploys the commit CI last passed on `main`. GitHub turns off a public repository's schedules after 60 days without activity; re-enable it under **Actions → Watch kflare**.

```bash
curl -sI https://kflare.dev/ | grep -i content-security-policy
curl -s -o /dev/null -w '%{http_code}\n' https://kflare.dev/no-such-page   # 404
curl -s https://kflare.dev/source.json   # the kflare release, CHANGELOG and ROADMAP it was built from
```

To preview it locally, build it with `npm run build -w @site/kflare-site`, then run `npx wrangler dev` in `apps/kflare-site` (in Docker on older distros, as above).

## History

The original design used CloudFront with its flat-rate free plan. AWS blocked CloudFront (and Route 53 registration) pending account verification, so the edge moved to Cloudflare, where the domain lives anyway. The Lambda side is unchanged.
