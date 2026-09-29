variable "region" {
  type    = string
  default = "us-east-2"
}

variable "domain" {
  description = "Apex domain, registered with Cloudflare Registrar (DNS on Cloudflare)."
  type        = string
  default     = "jonathangraniero.dev"
}

variable "github_deploy_role_name" {
  description = "IAM role created by infra/bootstrap for GitHub Actions."
  type        = string
  default     = "gh-deploy-site"
}

variable "alert_email" {
  description = "Where budget alerts are sent."
  type        = string
}

variable "enable_waf" {
  description = "Attach a WAF web ACL. Free on the CloudFront flat-rate Free plan; ~$5+/mo on pay-as-you-go, so disable if not on the plan."
  type        = bool
  default     = true
}

variable "lambda_memory_mb" {
  description = "More memory also means more CPU, which shortens cold starts. 1024 MB stays well inside the always-free 400k GB-s."
  type        = number
  default     = 1024
}

variable "lambda_web_adapter_layer_version" {
  description = "Version of arn:aws:lambda:<region>:753240598075:layer:LambdaAdapterLayerArm64."
  type        = number
  default     = 30
}
