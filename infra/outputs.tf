output "instance_id" {
  description = "RENTCERT_HOST for Kamal (SSH goes through Systems Manager)."
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "Point the domain's A record here."
  value       = aws_eip.web.public_ip
}

output "ecr_registry" {
  description = "RENTCERT_REGISTRY for Kamal."
  value       = split("/", aws_ecr_repository.app.repository_url)[0]
}

output "documents_bucket" {
  value = aws_s3_bucket.documents.bucket
}

output "database_endpoint" {
  value = aws_db_instance.main.address
}

output "deploy_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN for the GitHub production environment."
  value       = var.github_repository != "" ? aws_iam_role.deploy[0].arn : null
}

output "app_secret_name" {
  description = "Fill in these values in AWS Secrets Manager before the first deploy."
  value       = aws_secretsmanager_secret.app.name
}

output "dns_records_to_add" {
  description = "Only when DNS is not in Route 53: add these records at your DNS provider."
  value       = local.use_route53 ? [] : local.dns_records
}
