output "site_url" {
  value = "https://${var.domain}"
}

output "ci_deploy_token_id" {
  description = "The Cloudflare token kflare-site-ci-deploy. Rotate it with `terraform apply -replace=cloudflare_account_token.ci_deploy`."
  value       = cloudflare_account_token.ci_deploy.id
}

output "ci_deploy_token_parameter" {
  description = "The SSM parameter .github/workflows/deploy-kflare.yml reads the token from."
  value       = aws_ssm_parameter.ci_deploy_token.name
}
