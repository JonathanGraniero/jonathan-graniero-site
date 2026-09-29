output "site_url" {
  value = local.site_url
}

output "cloudfront_distribution_id" {
  description = "GitHub variable CLOUDFRONT_DISTRIBUTION_ID."
  value       = aws_cloudfront_distribution.site.id
}

output "web_bucket" {
  description = "GitHub variable WEB_BUCKET."
  value       = aws_s3_bucket.site.bucket
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
  description = "Direct URL: should return 403 without the CloudFront header."
  value       = aws_lambda_function_url.api.function_url
}
