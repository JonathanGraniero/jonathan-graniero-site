# Zone-level Cloudflare configuration for jonathangraniero.dev. The Worker
# (script, static assets, apex custom domain) is owned by apps/edge/wrangler.jsonc.

locals {
  zone_id = data.cloudflare_zone.site.id
}

# ---------- Edge security settings ----------

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = local.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = local.zone_id
  setting_id = "min_tls_version"
  value      = "1.2"
}

resource "cloudflare_zone_setting" "tls_1_3" {
  zone_id    = local.zone_id
  setting_id = "tls_1_3"
  value      = "on"
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = local.zone_id
  setting_id = "ssl"
  value      = "strict"
}

# ---------- www → apex ----------

# Placeholder record so www resolves to Cloudflare's edge, where the redirect
# rule below answers. 100:: is the reserved discard prefix; no origin is used.
resource "cloudflare_dns_record" "www" {
  zone_id = local.zone_id
  name    = local.www_domain
  type    = "AAAA"
  content = "100::"
  ttl     = 1
  proxied = true
  comment = "www → apex redirect (terraform)"
}

resource "cloudflare_ruleset" "redirects" {
  zone_id = local.zone_id
  name    = "Redirects"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"
  rules = [{
    description = "www to apex"
    expression  = "(http.host eq \"${local.www_domain}\")"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.domain}\", http.request.uri.path)"
        }
      }
    }
  }]
}

# ---------- Rate limiting (Free plan: one rule, 10s period) ----------

# Credential stuffing and contact-form spam protection, in front of the API's
# own per-instance throttler. Only these two endpoints accept POSTs at these paths.
resource "cloudflare_ruleset" "rate_limit" {
  zone_id = local.zone_id
  name    = "Rate limiting"
  kind    = "zone"
  phase   = "http_ratelimit"
  rules = [{
    description = "Login and contact form"
    expression  = "(http.request.uri.path eq \"/api/auth/login\") or (http.request.uri.path eq \"/api/contact\")"
    action      = "block"
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 5
      mitigation_timeout  = 10
    }
  }]
}
