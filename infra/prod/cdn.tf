# ---------- TLS certificate (us-east-1 for CloudFront) ----------

resource "aws_acm_certificate" "site" {
  provider                  = aws.use1
  domain_name               = var.domain
  subject_alternative_names = [local.www_domain]
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for o in aws_acm_certificate.site.domain_validation_options : o.domain_name => {
      name   = o.resource_record_name
      type   = o.resource_record_type
      record = o.resource_record_value
    }
  }
  zone_id         = data.aws_route53_zone.site.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.use1
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ---------- Managed policies (looked up by name) ----------

data "aws_cloudfront_cache_policy" "static" {
  name = "Managed-CachingOptimized"
}

# Honour the API's own Cache-Control headers (public 60s content, no-store admin),
# keyed by query string so list filters cache separately.
data "aws_cloudfront_cache_policy" "api" {
  name = "UseOriginCacheControlHeaders-QueryStrings"
}

# Forward cookies, query strings and headers (except Host) to the Function URL.
data "aws_cloudfront_origin_request_policy" "api" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

# ---------- Edge function: www → apex redirect, SPA deep links ----------

resource "aws_cloudfront_function" "router" {
  name    = "${local.name}-router"
  runtime = "cloudfront-js-2.0"
  comment = "Redirect www to apex; serve index.html for client-side routes"
  publish = true
  code = templatefile("${path.module}/router.js.tftpl", {
    apex = var.domain
    www  = local.www_domain
  })
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${local.name}-web"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

locals {
  s3_origin_id  = "web"
  api_origin_id = "api"
  # Function URL is "https://<id>.lambda-url.<region>.on.aws/"; CloudFront needs the bare host.
  api_origin_host = trimsuffix(trimprefix(aws_lambda_function_url.api.function_url, "https://"), "/")
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  comment             = var.domain
  aliases             = [var.domain, local.www_domain]
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"
  web_acl_id          = var.enable_waf ? aws_wafv2_web_acl.site[0].arn : null

  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = local.api_origin_host
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 30
    }
    custom_header {
      name  = "X-Origin-Verify"
      value = data.aws_ssm_parameter.origin_verify_secret.value
    }
  }

  default_cache_behavior {
    target_origin_id           = local.s3_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.static.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.router.arn
    }
  }

  ordered_cache_behavior {
    path_pattern               = "/api/*"
    target_origin_id           = local.api_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.api.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.api.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
