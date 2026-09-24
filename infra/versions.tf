terraform {
  required_version = ">= 1.10"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # State bucket from infra/bootstrap. Native S3 locking (use_lockfile), no DynamoDB table.
  # `terraform init -backend-config="bucket=rentcert-tfstate-<account id>"`
  backend "s3" {
    key          = "rentcert/prod/terraform.tfstate"
    region       = "ap-southeast-2"
    profile      = "rentcert"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region  = var.region
  profile = var.aws_profile
  default_tags {
    tags = { project = "rentcert", environment = "prod", managed_by = "terraform" }
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
