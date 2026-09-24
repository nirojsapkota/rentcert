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

  user_data = templatefile("${path.module}/templates/user-data.sh.tftpl", {
    data_volume_id = aws_ebs_volume.data.id
    backup_bucket  = aws_s3_bucket.backups.bucket
  })

  # Standard CPU credits: no surprise "unlimited" charges; the instance slows down instead.
  credit_specification {
    cpu_credits = "standard"
  }

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
