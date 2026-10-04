# Least-privilege permissions for the GitHub Actions deploy role (created in
# infra/bootstrap), scoped to exactly the resources in this stack.

data "aws_iam_policy_document" "github_deploy" {
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
  # The Worker's secrets are uploaded by CI from SSM at deploy time.
  statement {
    sid     = "ReadWorkerSecrets"
    actions = ["ssm:GetParameter"]
    resources = [
      data.aws_ssm_parameter.origin_verify_secret.arn,
      data.aws_ssm_parameter.cache_purge_token.arn,
    ]
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
