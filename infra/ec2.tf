data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_key_pair" "deploy" {
  key_name   = "rentcert-deploy"
  public_key = var.deploy_ssh_public_key
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.web.id]
  key_name               = aws_key_pair.deploy.key_name
  iam_instance_profile   = aws_iam_instance_profile.web.name

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2          # containers can use the instance role
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  user_data = <<-EOT
    #!/bin/bash
    set -euo pipefail
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ca-certificates curl unattended-upgrades
    # Security updates install automatically; reboots happen at 03:30 Melbourne time if needed.
    echo 'Unattended-Upgrade::Automatic-Reboot "true";' > /etc/apt/apt.conf.d/52rentcert-reboot
    echo 'Unattended-Upgrade::Automatic-Reboot-Time "17:30";' >> /etc/apt/apt.conf.d/52rentcert-reboot
    timedatectl set-timezone UTC
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker ubuntu
    systemctl enable --now docker
    # Fixed subnet for Kamal's network, so the app can trust kamal-proxy (TRUSTED_PROXY_CIDRS).
    docker network create --subnet 172.30.0.0/16 kamal || true
    # The Systems Manager agent ships with Ubuntu AMIs; make sure it runs.
    snap start amazon-ssm-agent || true
  EOT

  lifecycle {
    ignore_changes = [ami, user_data] # AMI updates and user-data changes need a planned replacement
  }

  tags = { Name = "rentcert-web" }
}

resource "aws_eip" "web" {
  instance = aws_instance.web.id
  domain   = "vpc"
  tags     = { Name = "rentcert-web" }
}
