# NestJS API on Lambda (arm64) using the AWS Lambda Web Adapter: the app runs
# unchanged as an HTTP server and the adapter translates Lambda events.

data "archive_file" "placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/placeholder"
  output_path = "${path.module}/.build/placeholder.zip"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${local.name}-api"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.name}-api"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name}-api"
  role          = aws_iam_role.api.arn
  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "run.sh"
  memory_size   = var.lambda_memory_mb
  timeout       = 15 # covers Neon resuming from scale-to-zero

  # No reserved concurrency: this account's Lambda concurrency limit is 10,
  # and AWS requires 10 to stay unreserved. That account limit already bounds
  # concurrency (and Neon connections: 10 x DB_POOL_MAX); WAF rate limits and
  # budgets cover cost.

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  layers = ["arn:aws:lambda:${var.region}:753240598075:layer:LambdaAdapterLayerArm64:${var.lambda_web_adapter_layer_version}"]

  environment {
    variables = {
      AWS_LAMBDA_EXEC_WRAPPER      = "/opt/bootstrap"
      AWS_LWA_PORT                 = "8080"
      AWS_LWA_READINESS_CHECK_PATH = "/api/health/live"
      PORT                         = "8080"
      NODE_ENV                     = "production"
      TRUST_PROXY                  = "true"
      DB_POOL_MAX                  = "2"
      SITE_URL                     = local.site_url
      WEB_ORIGIN                   = local.site_url
      DATABASE_URL                 = data.aws_ssm_parameter.database_url.value
      JWT_SECRET                   = data.aws_ssm_parameter.jwt_secret.value
      ORIGIN_VERIFY_SECRET         = data.aws_ssm_parameter.origin_verify_secret.value
    }
  }

  # Code is shipped by the deploy workflow, not Terraform.
  lifecycle {
    ignore_changes = [filename, source_code_hash, s3_bucket, s3_key]
  }

  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy_attachment.api_logs]
}

# Public URL, but the app rejects any request without CloudFront's secret header.
# (OAC isn't used: it requires browsers to hash POST bodies for Lambda URLs.)
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}
