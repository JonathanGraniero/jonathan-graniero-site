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

## History

The original design used CloudFront with its flat-rate free plan. AWS blocked CloudFront (and Route 53 registration) pending account verification, so the edge moved to Cloudflare, where the domain lives anyway. The Lambda side is unchanged.
