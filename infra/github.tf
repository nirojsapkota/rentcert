# GitHub Actions deploy role, assumed with short-lived OIDC tokens (no AWS keys in GitHub).
# Only the main branch of var.github_repository in the "production" environment can assume it.
resource "aws_iam_openid_connect_provider" "github" {
  count          = var.github_repository != "" ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "deploy" {
  count = var.github_repository != "" ? 1 : 0
  name  = "rentcert-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github[0].arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:environment:production"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  count = var.github_repository != "" ? 1 : 0
  name  = "rentcert-deploy"
  role  = aws_iam_role.deploy[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Sid = "EcrLogin", Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*" },
      {
        Sid    = "EcrPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage",
          "ecr:DescribeImages", "ecr:DescribeRepositories",
        ]
        Resource = aws_ecr_repository.app.arn
      },
      {
        Sid      = "ReadDeployParameters"
        Effect   = "Allow"
        Action   = ["ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.parameter_prefix}"
      },
      {
        # SecureString parameters use the AWS-managed aws/ssm key.
        Sid       = "DecryptParameters"
        Effect    = "Allow"
        Action    = ["kms:Decrypt"]
        Resource  = "*"
        Condition = { StringEquals = { "kms:ViaService" = "ssm.${var.region}.amazonaws.com" } }
      },
      {
        Sid      = "SshThroughSsm"
        Effect   = "Allow"
        Action   = ["ssm:StartSession"]
        Resource = [aws_instance.web.arn, "arn:aws:ssm:${var.region}::document/AWS-StartSSHSession"]
      },
      { Sid = "EndOwnSessions", Effect = "Allow", Action = ["ssm:TerminateSession", "ssm:ResumeSession"], Resource = "arn:aws:ssm:*:*:session/$${aws:userid}-*" },
    ]
  })
}
