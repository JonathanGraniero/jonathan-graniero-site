# Infrastructure

Serverless production setup on AWS, costing about **$17/yr** (the domain). Everything else fits in free allowances.

```
Route 53 ──► CloudFront (flat-rate Free plan: CDN, TLS, WAF, DNS)
               ├─ /*      → S3 (private, OAC)            React build
               └─ /api/*  → Lambda Function URL          NestJS via Lambda Web Adapter
                            (+ secret X-Origin-Verify header)    │
                                                                 ▼
                                                   Neon Postgres (free tier)
```

| Directory    | Purpose                                                                          | State                       |
| ------------ | -------------------------------------------------------------------------------- | --------------------------- |
| `bootstrap/` | State bucket, GitHub OIDC provider, deploy role. Applied once.                   | Local (`terraform.tfstate`) |
| `prod/`      | Buckets, Lambda, CloudFront, ACM, WAF, DNS records, budgets, deploy permissions. | S3 (from `bootstrap`)       |

Deploys are handled by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), which runs after CI passes on `main`. Terraform only creates the infrastructure; it never ships code.

## First-time setup

### 0. Prerequisites (manual)

1. **Register the domain** `jonathangraniero.dev` in the Route 53 console (Registered domains → Register). This creates the hosted zone automatically.
2. **Create a Neon project** (<https://neon.tech>, Free plan) in region **AWS US East 2 (Ohio)**, with a database named `site`. Copy both connection strings:
   - **Pooled** (host contains `-pooler`): used by the Lambda at runtime.
   - **Direct**: used for migrations, seeding and backups.
3. **Store the runtime secrets in SSM** (SecureString, us-east-2):

   ```bash
   aws ssm put-parameter --type SecureString --name /site/prod/DATABASE_URL        --value '<neon pooled url>'
   aws ssm put-parameter --type SecureString --name /site/prod/JWT_SECRET          --value "$(openssl rand -base64 48)"
   aws ssm put-parameter --type SecureString --name /site/prod/ORIGIN_VERIFY_SECRET --value "$(openssl rand -hex 32)"
   ```

### 1. Bootstrap

```bash
cd infra/bootstrap
terraform init && terraform apply
terraform output   # note state_bucket and github_deploy_role_arn
```

### 2. Production stack

```bash
cd ../prod
cp terraform.tfvars.example terraform.tfvars   # set alert_email
terraform init -backend-config="bucket=<state_bucket from bootstrap>"
terraform apply
```

The first apply takes about 5–10 minutes (CloudFront and ACM validation). The API answers `503 API not deployed yet` until the first deploy.

### 3. CloudFront Free plan (console, one time)

Terraform can't manage pricing plans yet (provider PR [#49235](https://github.com/hashicorp/terraform-provider-aws/pull/49235)).

1. Go to **CloudFront → Distributions → (jonathangraniero.dev) → Manage plan**.
2. Choose **Free**.
3. Attach the **Route 53 hosted zone** to the plan so its fees are covered.

If the account isn't eligible, set `enable_waf = false` in `terraform.tfvars` and re-apply. Pay-as-you-go WAF costs about $5+/month, while CloudFront itself stays within its always-free allowance. While a distribution is subscribed, CloudFront blocks deleting it or swapping its WAF, so cancel the plan before `terraform destroy`.

### 4. GitHub configuration

- **Environment:** create an environment named `production` (Settings → Environments). Add **secret** `NEON_DIRECT_URL` = the Neon direct URL.
- **Repository variables:** add these (Settings → Secrets and variables → Actions → Variables), using the values from `terraform output`:

  | Variable                     | Value                                  |
  | ---------------------------- | -------------------------------------- |
  | `AWS_DEPLOY_ROLE_ARN`        | `bootstrap` → `github_deploy_role_arn` |
  | `WEB_BUCKET`                 | `web_bucket`                           |
  | `ARTIFACTS_BUCKET`           | `artifacts_bucket`                     |
  | `BACKUPS_BUCKET`             | `backups_bucket`                       |
  | `CLOUDFRONT_DISTRIBUTION_ID` | `cloudfront_distribution_id`           |
  | `LAMBDA_FUNCTION_NAME`       | `lambda_function_name`                 |
  | `SITE_URL`                   | `site_url`                             |

  Deploys are skipped until `AWS_DEPLOY_ROLE_ARN` is set.

### 5. Seed and deploy

```bash
# From the repo root. Creates the admin user plus starter content.
DATABASE_URL='<neon direct url>' ADMIN_EMAIL='you@…' ADMIN_PASSWORD='<strong password>' \
  npm run db:deploy -w @site/api && \
DATABASE_URL='<neon direct url>' ADMIN_EMAIL='you@…' ADMIN_PASSWORD='<strong password>' \
  npm run db:seed
```

Then run **Actions → Deploy → Run workflow** (or push to `main`).

## Verify

```bash
curl -s https://jonathangraniero.dev/api/health          # {"status":"ok",...}
curl -s -o /dev/null -w '%{http_code}\n' "$(terraform -chdir=infra/prod output -raw lambda_function_url)api/posts"   # 403
curl -sI http://jonathangraniero.dev | grep -i location   # https://…
curl -sI https://www.jonathangraniero.dev | grep -i location   # https://jonathangraniero.dev/
```

## Operations

- **Logs:** CloudWatch log group `/aws/lambda/jg-site-api` (14-day retention).
- **Backups:** the weekly [`backup.yml`](../.github/workflows/backup.yml) workflow writes `pg_dump` output to the backups bucket, kept for 90 days. To restore:

  ```bash
  gunzip -c site-<ts>.sql.gz | psql '<neon direct url>'
  ```

- **Cost guardrails:**
  - AWS Budget emails at $2 (actual) and $5 (forecast).
  - Lambda reserved concurrency of 5.
  - The WAF rate limits login and contact POSTs.
- **Cold starts:** after about 5 idle minutes, the first request pays for a Lambda cold start plus Neon resuming, usually 1–3s. Edge caching of public API responses (60s) hides most of this.
- **Rotating secrets:** update the SSM parameter, then `terraform apply` in `prod`. The Lambda environment and the CloudFront header are re-read.
