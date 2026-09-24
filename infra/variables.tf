variable "region" {
  type    = string
  default = "ap-southeast-2"
}

variable "aws_profile" {
  description = "AWS CLI profile for Terraform. Never the root account."
  type        = string
  default     = "rentcert"
}

variable "domain" {
  description = "Public app domain, for example app.rentcert.com.au. Leave empty until you have one: SES and DNS records are created only when set."
  type        = string
  default     = ""
}

variable "mail_from_domain" {
  description = "Domain to send email from (usually the apex, for example rentcert.com.au). Defaults to var.domain."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone id for the domain. If empty, Terraform outputs the DNS records to add by hand."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as owner/name. Leave empty to skip the CI role."
  type        = string
  default     = ""
}

variable "deploy_ssh_public_key" {
  description = "Public half of the SSH key Kamal uses (the private half is a GitHub secret). SSH only travels through Systems Manager."
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "budget_email" {
  description = "Receives AWS budget alerts."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly cost alert threshold in USD (about A$60)."
  type        = number
  default     = 40
}
