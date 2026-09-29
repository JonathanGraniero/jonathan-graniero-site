variable "region" {
  type    = string
  default = "us-east-2"
}

variable "github_sub_prefix" {
  description = "Immutable OIDC subject prefix for the repo: `gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix`."
  type        = string
  default     = "repo:JonathanGraniero@108536463/jonathan-graniero-site@1393990850"
}

variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy."
  type        = string
  default     = "JonathanGraniero/jonathan-graniero-site"
}
