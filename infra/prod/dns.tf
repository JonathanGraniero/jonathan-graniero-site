resource "aws_route53_record" "site" {
  for_each = toset(flatten([for name in [var.domain, local.www_domain] : ["${name}|A", "${name}|AAAA"]]))

  zone_id = data.aws_route53_zone.site.zone_id
  name    = split("|", each.key)[0]
  type    = split("|", each.key)[1]
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
