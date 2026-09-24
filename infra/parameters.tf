# App configuration in SSM Parameter Store (SecureString, standard tier: free).
# Kamal reads everything under /rentcert/prod at deploy time (.kamal/secrets).
#   Written by Terraform: DATABASE_URL, POSTGRES_PASSWORD, AWS_S3_BUCKET, AWS_BACKUP_BUCKET,
#                         MAILER_FROM, BETTER_AUTH_URL
#   Filled in by you:     the keys in local.app_parameters (Terraform never overwrites them)
locals {
  parameter_prefix = "/rentcert/prod"
  infra_parameters = {
    DATABASE_URL      = local.database_url
    POSTGRES_PASSWORD = random_password.db.result
    AWS_S3_BUCKET     = aws_s3_bucket.documents.bucket
    AWS_BACKUP_BUCKET = aws_s3_bucket.backups.bucket
    MAILER_FROM       = local.has_domain ? "RentCert <reminders@${local.mail_domain}>" : "unset"
    BETTER_AUTH_URL   = local.has_domain ? "https://${var.domain}" : "unset"
  }
  app_parameters = [
    "BETTER_AUTH_SECRET",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_PROPERTY",
    "STRIPE_PRICE_PORTFOLIO",
    "SENTRY_DSN",
    "ALERT_EMAIL",
  ]
}

resource "aws_ssm_parameter" "infra" {
  for_each = local.infra_parameters
  name     = "${local.parameter_prefix}/${each.key}"
  type     = "SecureString"
  tier     = "Standard"
  value    = each.value
}

resource "aws_ssm_parameter" "app" {
  for_each = toset(local.app_parameters)
  name     = "${local.parameter_prefix}/${each.value}"
  type     = "SecureString"
  tier     = "Standard"
  value    = "unset"
  lifecycle {
    ignore_changes = [value] # set with: aws ssm put-parameter --overwrite (see docs/runbook.md)
  }
}
