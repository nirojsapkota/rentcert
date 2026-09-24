# Amazon SES, created only once a domain is set. New SES accounts start in the sandbox; request
# production access in the SES console (see docs/runbook.md).
locals {
  mail_domain = var.mail_from_domain != "" ? var.mail_from_domain : var.domain
  has_domain  = var.domain != ""
  use_route53 = local.has_domain && var.route53_zone_id != ""
}

resource "aws_sesv2_email_identity" "domain" {
  count          = local.has_domain ? 1 : 0
  email_identity = local.mail_domain
}

resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  count                  = local.has_domain ? 1 : 0
  email_identity         = aws_sesv2_email_identity.domain[0].email_identity
  mail_from_domain       = "mail.${local.mail_domain}"
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

locals {
  dns_records = local.has_domain ? concat(
    [{ name = var.domain, type = "A", value = aws_eip.web.public_ip }],
    [for token in aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens :
    { name = "${token}._domainkey.${local.mail_domain}", type = "CNAME", value = "${token}.dkim.amazonses.com" }],
    [
      { name = "mail.${local.mail_domain}", type = "MX", value = "10 feedback-smtp.${var.region}.amazonses.com" },
      { name = "mail.${local.mail_domain}", type = "TXT", value = "\"v=spf1 include:amazonses.com ~all\"" },
      { name = "_dmarc.${local.mail_domain}", type = "TXT", value = "\"v=DMARC1; p=quarantine; adkim=s; aspf=s\"" },
    ],
  ) : []
}

resource "aws_route53_record" "records" {
  for_each = local.use_route53 ? { for record in local.dns_records : "${record.type} ${record.name}" => record } : {}
  zone_id  = var.route53_zone_id
  name     = each.value.name
  type     = each.value.type
  ttl      = 300
  records  = [each.value.value]
}
