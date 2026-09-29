output "site_url" {
  value = local.site_url
}

output "artifacts_bucket" {
  description = "GitHub variable ARTIFACTS_BUCKET."
  value       = aws_s3_bucket.artifacts.bucket
}

output "backups_bucket" {
  description = "GitHub variable BACKUPS_BUCKET."
  value       = aws_s3_bucket.backups.bucket
}

output "lambda_function_name" {
  description = "GitHub variable LAMBDA_FUNCTION_NAME."
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_url" {
  description = "API_ORIGIN for apps/edge/wrangler.jsonc. Direct calls return 403 without the Worker's secret header."
  value       = aws_lambda_function_url.api.function_url
}
