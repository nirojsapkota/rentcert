resource "random_password" "db" {
  length  = 32
  special = false # safe inside a connection URL
}

resource "aws_db_subnet_group" "main" {
  name       = "rentcert"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_parameter_group" "main" {
  name   = "rentcert-pg16"
  family = "postgres16"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "rentcert"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  db_name  = "rentcert"
  username = "rentcert"
  password = random_password.db.result

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.main.name
  publicly_accessible    = false
  multi_az               = false

  # Automated daily backups with point-in-time recovery for 7 days.
  backup_retention_period    = 7
  backup_window              = "16:00-16:30" # 02:00–02:30 Melbourne (AEST)
  maintenance_window         = "sun:17:00-sun:17:30"
  copy_tags_to_snapshot      = true
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "rentcert-final"
  auto_minor_version_upgrade = true
  apply_immediately          = false

  performance_insights_enabled = false
}

locals {
  # Full TLS verification against Amazon's RDS CA bundle, which the image downloads at build time.
  database_url = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.address}:5432/${aws_db_instance.main.db_name}?sslmode=verify-full&sslrootcert=/app/certs/rds-global-bundle.pem"
}
