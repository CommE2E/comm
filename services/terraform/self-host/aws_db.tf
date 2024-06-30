# MariaDB Security Group
resource "aws_security_group" "keyserver_mariadb_security_group" {
  name        = "keyserver-mariadb-sg"
  description = "Allow inbound traffic on port 3307 and all outbound traffic"
  vpc_id      = data.aws_vpc.default.id

  # Inbound rules
  ingress {
    from_port       = 3307
    to_port         = 3307
    protocol        = "tcp"
    security_groups = [aws_security_group.keyserver_service.id]
  }

  ingress {
    from_port   = 3307
    to_port     = 3307
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
  instance_class         = var.db_instance_class
  vpc_security_group_ids = [aws_security_group.keyserver_mariadb_security_group.id]
  db_subnet_group_name   = aws_db_subnet_group.public_db_subnet_group.name
  username               = var.mariadb_username
  password               = var.mariadb_password
  parameter_group_name   = aws_db_parameter_group.mariadb_parameter_group.name
  storage_encrypted      = true
  publicly_accessible    = true
  port                   = 3307
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
