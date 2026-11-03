# kflare.dev, the kflare project site (apps/kflare-site):
#   - The Worker (static assets, kflare.dev and www custom domains) is declared
#     in apps/kflare-site/wrangler.jsonc and shipped by `wrangler deploy` in
#     .github/workflows/deploy-kflare.yml.
#   - This stack creates the Cloudflare token that job deploys with, stores it
#     in SSM, and lets the GitHub deploy role (infra/bootstrap) read it.
#   - kflare's live e2e suite tests against the kflare.dev zone, so zone
#     settings and rulesets stay out of here (see infra/README.md).
#
#   export CLOUDFLARE_API_TOKEN=...   # can create account API tokens
#   terraform init -backend-config="bucket=<bootstrap state_bucket>"
#   terraform apply

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.26"
    }
  }
  backend "s3" {
    key          = "kflare/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = "kflare-site", Environment = "prod", ManagedBy = "terraform" }
  }
}

# Reads CLOUDFLARE_API_TOKEN from the environment.
provider "cloudflare" {}

# Registered with Cloudflare Registrar, which created the zone.
data "cloudflare_zone" "kflare" {
  filter = {
    name = var.domain
  }
}

locals {
  account_id = data.cloudflare_zone.kflare.account.id
  zone_id    = data.cloudflare_zone.kflare.id
}
