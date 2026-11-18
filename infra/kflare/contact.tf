# The contact form and contact@kflare.dev both reach var.contact_inbox, a
# destination address already verified in the account's Email Routing.
# Workers' send_email can only deliver to a verified destination, not to
# contact@ itself, so the Worker gets the inbox as its CONTACT_TO secret.
# The address stays out of the repo: pass it in a gitignored *.tfvars.

resource "cloudflare_email_routing_rule" "contact" {
  zone_id  = local.zone_id
  name     = "contact@ to the maintainer"
  enabled  = true
  matchers = [{ type = "literal", field = "to", value = "contact@${var.domain}" }]
  actions  = [{ type = "forward", value = [var.contact_inbox] }]
}

# deploy-kflare.yml reads it and deploys it as the Worker secret CONTACT_TO.
resource "aws_ssm_parameter" "contact_to" {
  name        = "/site/kflare/CONTACT_TO"
  description = "Inbox the kflare.dev contact form mails (Worker secret CONTACT_TO)."
  type        = "SecureString"
  value       = var.contact_inbox
}
