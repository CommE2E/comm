# MariaDB Security Group
resource "aws_security_group" "keyserver_mariadb_security_group" {
  name        = "keyserver-mariadb-sg"
  description = "Allow inbound traffic on port 3307 and all outbound traffic"
  vpc_id      = aws_vpc.default.id

  # Inbound rules
  ingress {
    from_port   = 3307
    to_port     = 3307
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Allow from anywhere, you can modify this to specific IPs or ranges
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
  allocated_storage      = 5
  db_name                = "mariadb"
  identifier             = "mariadb-instance"
  engine                 = "mariadb"
  engine_version         = "10.11"
  instance_class         = "db.t3.micro"
  db_subnet_group_name   = aws_db_subnet_group.private-db-subnet-group.name
  vpc_security_group_ids = [aws_security_group.keyserver_mariadb_security_group.id]
  username               = local.secrets["mariaDB"]["username"]
  password               = local.secrets["mariaDB"]["password"]
  parameter_group_name   = "default.mariadb10.11"
  port                   = 3307
  skip_final_snapshot    = true
}
