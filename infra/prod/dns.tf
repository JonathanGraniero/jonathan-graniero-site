# Apex and www point at CloudFront. DNS-only (proxied = false): CloudFront is
# the CDN, and a second proxy in front would break TLS and double-cache. The
# apex CNAME works because Cloudflare flattens it to A/AAAA answers.
resource "cloudflare_dns_record" "site" {
  for_each = toset([var.domain, local.www_domain])

  zone_id = data.cloudflare_zone.site.id
  name    = each.value
  type    = "CNAME"
  content = aws_cloudfront_distribution.site.domain_name
  ttl     = 1 # automatic
  proxied = false
  comment = "CloudFront (terraform)"
}
