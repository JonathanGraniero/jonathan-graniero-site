output "state_bucket" {
  value = aws_s3_bucket.tfstate.bucket
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN variable on the GitHub `production` environment."
  value       = aws_iam_role.github_deploy.arn
}

output "github_deploy_role_name" {
  value = aws_iam_role.github_deploy.name
}
