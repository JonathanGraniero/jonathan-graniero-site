# Production stack (hybrid):
#   - Cloudflare: domain, DNS, edge settings, www redirect, rate limiting (this
#     stack). The Worker itself (static site + /api proxy) is declared in
#     apps/edge/wrangler.jsonc and shipped by `wrangler deploy`.
#   - AWS: the NestJS API on Lambda (via the Lambda Web Adapter) behind a
#     Function URL, deploy artifacts, backups, budgets.
#
#   export CLOUDFLARE_API_TOKEN=...   # Zone:DNS:Edit on the domain's zone
#   terraform init -backend-config="bucket=<bootstrap state_bucket>"
#   terraform apply

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.26"
    }
  }
  backend "s3" {
    key          = "prod/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = "jonathan-graniero-site", Environment = "prod", ManagedBy = "terraform" }
  }
}

# Reads CLOUDFLARE_API_TOKEN from the environment.
provider "cloudflare" {}

data "aws_caller_identity" "current" {}

locals {
  name       = "jg-site"
  www_domain = "www.${var.domain}"
  site_url   = "https://${var.domain}"
}

# The domain is registered with Cloudflare Registrar, which requires Cloudflare
# DNS; the zone is created automatically at registration.
data "cloudflare_zone" "site" {
  filter = {
    name = var.domain
  }
}

# Secrets are created by hand in SSM (see infra/README.md) and never committed.
data "aws_ssm_parameter" "database_url" {
  name = "/site/prod/DATABASE_URL"
}

data "aws_ssm_parameter" "jwt_secret" {
  name = "/site/prod/JWT_SECRET"
}

data "aws_ssm_parameter" "origin_verify_secret" {
  name = "/site/prod/ORIGIN_VERIFY_SECRET"
}
