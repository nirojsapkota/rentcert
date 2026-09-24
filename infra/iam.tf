# EC2 instance role: only what the app needs at runtime.
resource "aws_iam_role" "web" {
  name = "rentcert-web"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}

resource "aws_iam_instance_profile" "web" {
  name = "rentcert-web"
  role = aws_iam_role.web.name
}

# Systems Manager: lets deploys and admins reach the host without an open SSH port.
resource "aws_iam_role_policy_attachment" "web_ssm" {
  role       = aws_iam_role.web.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "web_app" {
  name = "rentcert-app"
  role = aws_iam_role.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid      = "DocumentObjects"
          Effect   = "Allow"
          Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
          Resource = "${aws_s3_bucket.documents.arn}/documents/*"
        },
        {
          # The host's backup timer writes dumps; the worker lists them to alert on stale backups.
          Sid      = "DatabaseBackups"
          Effect   = "Allow"
          Action   = ["s3:PutObject", "s3:GetObject"]
          Resource = "${aws_s3_bucket.backups.arn}/postgres/*"
        },
        {
          Sid       = "BackupListing"
          Effect    = "Allow"
          Action    = ["s3:ListBucket"]
          Resource  = aws_s3_bucket.backups.arn
          Condition = { StringLike = { "s3:prefix" = ["postgres/*"] } }
        },
        {
          Sid       = "DocumentListing"
          Effect    = "Allow"
          Action    = ["s3:ListBucket"]
          Resource  = aws_s3_bucket.documents.arn
          Condition = { StringLike = { "s3:prefix" = ["documents/*"] } }
        },
      ],
      local.has_domain ? [{
        Sid      = "SendEmail"
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = aws_sesv2_email_identity.domain[0].arn
      }] : [],
    )
  })
}
