# Least-privilege permissions for the GitHub Actions deploy role (created in
# infra/bootstrap), scoped to exactly the resources in this stack.

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "WebSync"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }
  statement {
    sid       = "WebObjects"
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }
  statement {
    sid       = "Artifacts"
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
  }
  statement {
    sid       = "Backups"
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.backups.arn}/*"]
  }
  statement {
    sid       = "Invalidate"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
  statement {
    sid       = "DeployLambda"
    actions   = ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"]
    resources = [aws_lambda_function.api.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy-${local.name}"
  role   = var.github_deploy_role_name
  policy = data.aws_iam_policy_document.github_deploy.json
}
