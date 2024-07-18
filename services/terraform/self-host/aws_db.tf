locals {
  mariadb_database_name = local.local_with_default_environment_vars.COMM_DATABASE_DATABASE
  mariadb_username      = local.local_with_default_environment_vars.COMM_DATABASE_USER
  mariadb_password      = local.local_with_default_environment_vars.COMM_DATABASE_PASSWORD
  mariadb_port          = jsondecode(local.local_with_default_environment_vars.COMM_DATABASE_PORT)
}

# MariaDB Security Group
resource "aws_security_group" "keyserver_mariadb_security_group" {
  name        = "keyserver-mariadb-sg"
  description = "Allow inbound traffic on mariadb port and all outbound traffic"
  vpc_id      = local.vpc_id

  # Inbound rules
  ingress {
    from_port       = local.mariadb_port
    to_port         = local.mariadb_port
    protocol        = "tcp"
    security_groups = [aws_security_group.keyserver_service.id]
  }

  ingress {
    from_port   = local.mariadb_port
    to_port     = local.mariadb_port
    protocol    = "tcp"
    cidr_blocks = ["${var.allowed_ip}/32"]
  }

  # Outbound rules
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# MariaDB RDS Instance
resource "aws_db_instance" "mariadb" {
  allocated_storage      = 100
  max_allocated_storage  = 3000
  storage_type           = "gp3"
  db_name                = "mariadb"
  identifier             = "mariadb-instance"
  engine                 = "mariadb"
  engine_version         = "10.11"
  instance_class         = "db.m6g.large"
  db_subnet_group_name   = aws_db_subnet_group.public_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.keyserver_mariadb_security_group.id]
  username               = local.mariadb_username
  password               = local.mariadb_password
  parameter_group_name   = aws_db_parameter_group.mariadb_parameter_group.name
  storage_encrypted      = true
  publicly_accessible    = true
  port                   = local.mariadb_port
  skip_final_snapshot    = true
}

# MariaDB Parameter Group
resource "aws_db_parameter_group" "mariadb_parameter_group" {
  name   = "mariadb-parameter-group"
  family = "mariadb10.11"

  parameter {
    apply_method = "pending-reboot"
    name         = "performance_schema"
    value        = "1"
  }

  parameter {
    apply_method = "immediate"
    name         = "max_allowed_packet"
    # 256 MiB: (1024 * 1024 * 256)
    value = "268435456"
  }

  parameter {
    apply_method = "immediate"
    name         = "local_infile"
    value        = "0"
  }

  parameter {
    apply_method = "immediate"
    name         = "sql_mode"
    value        = "STRICT_ALL_TABLES"
  }

  parameter {
    apply_method = "pending-reboot"
    name         = "innodb_buffer_pool_size"
    value        = "{DBInstanceClassMemory*3/4}"
  }

  parameter {
    apply_method = "pending-reboot"
    name         = "innodb_ft_min_token_size"
    value        = "1"
  }

  parameter {
    apply_method = "immediate"
    name         = "innodb_ft_enable_stopword"
    value        = "0"
  }
}

resource "null_resource" "create_comm_database" {
  depends_on = [aws_db_instance.mariadb, aws_security_group.keyserver_mariadb_security_group]

  provisioner "local-exec" {
    command = <<EOT
    mysql --user=${local.mariadb_username} \
          --port=${local.mariadb_port} \
          --host=${aws_db_instance.mariadb.address} \
          --execute="CREATE DATABASE IF NOT EXISTS ${local.mariadb_database_name};" \
          --password=${local.mariadb_password}
    EOT
  }
}
