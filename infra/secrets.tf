# Two secrets, read by Kamal at deploy time (.kamal/secrets):
#   rentcert/prod/infra: written by Terraform from the resources it creates.
#   rentcert/prod/app:   created with empty values; you fill them in (Terraform never overwrites them).
resource "aws_secretsmanager_secret" "infra" {
  name                    = "rentcert/prod/infra"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "infra" {
  secret_id = aws_secretsmanager_secret.infra.id
  secret_string = jsonencode({
    DATABASE_URL    = local.database_url
    AWS_S3_BUCKET   = aws_s3_bucket.documents.bucket
    MAILER_FROM     = local.has_domain ? "RentCert <reminders@${local.mail_domain}>" : ""
    BETTER_AUTH_URL = local.has_domain ? "https://${var.domain}" : ""
  })
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "rentcert/prod/app"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    BETTER_AUTH_SECRET     = ""
    STRIPE_SECRET_KEY      = ""
    STRIPE_WEBHOOK_SECRET  = ""
    STRIPE_PRICE_PROPERTY  = ""
    STRIPE_PRICE_PORTFOLIO = ""
    SENTRY_DSN             = ""
    ALERT_EMAIL            = ""
  })
  lifecycle {
    ignore_changes = [secret_string] # values are managed by you, not Terraform
  }
}
