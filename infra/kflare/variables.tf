variable "region" {
  type    = string
  default = "us-east-2"
}

variable "domain" {
  description = "The site's apex domain, registered with Cloudflare Registrar (DNS on Cloudflare)."
  type        = string
  default     = "kflare.dev"
}

variable "github_deploy_role_name" {
  description = "IAM role created by infra/bootstrap for GitHub Actions."
  type        = string
  default     = "gh-deploy-site"
}
