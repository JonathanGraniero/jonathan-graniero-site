variable "region" {
  type    = string
  default = "us-east-2"
}

variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy."
  type        = string
  default     = "JonathanGraniero/jonathan-graniero-site"
}
