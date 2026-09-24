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

output "backups_bucket" {
  value = aws_s3_bucket.backups.bucket
}

output "deploy_role_arn" {
  description = "AWS_DEPLOY_ROLE_ARN for the GitHub production environment."
  value       = var.github_repository != "" ? aws_iam_role.deploy[0].arn : null
}

output "app_parameters_to_set" {
  description = "Set these SSM parameters before the first deploy (docs/runbook.md section 1.5)."
  value       = [for name in local.app_parameters : "${local.parameter_prefix}/${name}"]
}

output "dns_records_to_add" {
  description = "Only when DNS is not in Route 53: add these records at your DNS provider."
  value       = local.use_route53 ? [] : local.dns_records
}
