# The token CI deploys kflare.dev with: the permissions of the personal site's
# jg-site-ci-deploy, on the kflare.dev zone only. Workers Scripts can't be
# limited to one script, so it can deploy any Worker in the account.

locals {
  # Permission group IDs are the same in every account:
  # GET /accounts/{account_id}/tokens/permission_groups lists them.
  permission_groups = {
    workers_scripts_write  = "e086da7e2179491d91ee5f35b3ca210a" # Account: Workers Scripts Write
    zone_read              = "c8fed203ed3043cba015a93ad1616f1f" # Zone: Zone Read
    dns_write              = "4755a26eedb94da69e1066d98aa820be" # Zone: DNS Write
    workers_routes_write   = "28f4b596e7d643029c524985477ae49a" # Zone: Workers Routes Write
    ssl_certificates_write = "c03055bc037c4ea9afb9a9f104b7b721" # Zone: SSL and Certificates Write
  }
}

resource "cloudflare_account_token" "ci_deploy" {
  account_id = local.account_id
  name       = "kflare-site-ci-deploy"
  policies = [
    {
      effect            = "allow"
      permission_groups = [{ id = local.permission_groups.workers_scripts_write }]
      resources         = jsonencode({ "com.cloudflare.api.account.${local.account_id}" = "*" })
    },
    {
      # Custom domains: the DNS record, its edge certificate and the route.
      effect = "allow"
      permission_groups = [
        { id = local.permission_groups.zone_read },
        { id = local.permission_groups.dns_write },
        { id = local.permission_groups.workers_routes_write },
        { id = local.permission_groups.ssl_certificates_write },
      ]
      resources = jsonencode({ "com.cloudflare.api.account.zone.${local.zone_id}" = "*" })
    },
  ]
}

# The deploy job reads the token here through GitHub OIDC, as the personal
# site's edge job reads its Worker secrets: nothing is stored in GitHub.
resource "aws_ssm_parameter" "ci_deploy_token" {
  name        = "/site/kflare/CLOUDFLARE_CI_TOKEN"
  description = "Cloudflare token kflare-site-ci-deploy (infra/kflare), for wrangler deploy in CI."
  type        = "SecureString"
  value       = cloudflare_account_token.ci_deploy.value
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "ReadCloudflareToken"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.ci_deploy_token.arn]
  }
}

# A second inline policy on the role infra/bootstrap created; infra/prod owns
# the first (deploy-jg-site).
resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy-kflare-site"
  role   = var.github_deploy_role_name
  policy = data.aws_iam_policy_document.github_deploy.json
}
