# VPC
resource "aws_vpc" "default" {
  cidr_block           = "172.31.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

# Internet Gateway
resource "aws_internet_gateway" "default" {
  vpc_id = aws_vpc.default.id
}

# Route Table
resource "aws_route_table" "default" {
  vpc_id = aws_vpc.default.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.default.id
  }
}

# Public Subnet
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.0.0/20"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = true
}

# Private Subnets
resource "aws_subnet" "private_b" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.16.0/20"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = false
}

resource "aws_subnet" "private_c" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.32.0/20"
  availability_zone       = "us-east-2c"
  map_public_ip_on_launch = false
}

# DB Subnet Group
resource "aws_db_subnet_group" "private-db-subnet-group" {
  name       = "private-db-subnet-group"
  subnet_ids = [aws_subnet.private_b.id, aws_subnet.private_c.id]

  tags = {
    Name = "DB subnet group associated with private vpc subnet"
  }
}
