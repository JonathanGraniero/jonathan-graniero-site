# WAF web ACL (us-east-1, CLOUDFRONT scope). Included in the CloudFront
# flat-rate Free plan (up to 5 rules); set enable_waf = false otherwise.

resource "aws_wafv2_web_acl" "site" {
  count    = var.enable_waf ? 1 : 0
  provider = aws.use1
  name     = "${local.name}-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "aws-common"
    priority = 10
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
        # Admin post bodies can exceed the rule's 8 KB limit; count instead of block.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "aws-known-bad-inputs"
    priority = 20
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Tight limit on credential and contact-form POSTs.
  rule {
    name     = "rate-limit-sensitive-posts"
    priority = 30
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit                 = 20
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300
        scope_down_statement {
          and_statement {
            statement {
              byte_match_statement {
                field_to_match {
                  method {}
                }
                positional_constraint = "EXACTLY"
                search_string         = "POST"
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              or_statement {
                statement {
                  byte_match_statement {
                    field_to_match {
                      uri_path {}
                    }
                    positional_constraint = "STARTS_WITH"
                    search_string         = "/api/auth/login"
                    text_transformation {
                      priority = 0
                      type     = "NONE"
                    }
                  }
                }
                statement {
                  byte_match_statement {
                    field_to_match {
                      uri_path {}
                    }
                    positional_constraint = "STARTS_WITH"
                    search_string         = "/api/contact"
                    text_transformation {
                      priority = 0
                      type     = "NONE"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit-sensitive-posts"
      sampled_requests_enabled   = true
    }
  }

  # Broad per-IP flood protection.
  rule {
    name     = "rate-limit-global"
    priority = 40
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit                 = 1000
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit-global"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf"
    sampled_requests_enabled   = true
  }
}
