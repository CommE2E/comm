# Default VPC Data

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default.id]
  }
}


# User Created VPC
resource "aws_vpc" "default" {
  cidr_block           = "172.31.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.0.0/20"
  availability_zone       = var.availability_zone_1
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.16.0/20"
  availability_zone       = var.availability_zone_2
  map_public_ip_on_launch = true
}


resource "aws_internet_gateway" "default" {
  vpc_id = aws_vpc.default.id
}

# Route Table for Internet Gateway
resource "aws_route_table" "public_igw_route_table" {
  vpc_id = local.vpc_id

  route {
    cidr_block = "${var.allowed_ip}/32"
    gateway_id = var.user_created_vpc ? aws_internet_gateway.default.id : data.aws_internet_gateway.default.id
  }
}

resource "aws_route_table_association" "public_1_igw_route_association" {
  subnet_id      = local.vpc_subnets[0]
  route_table_id = aws_route_table.public_igw_route_table.id
}

resource "aws_route_table_association" "public_2_igw_route_association" {
  subnet_id      = local.vpc_subnets[1]
  route_table_id = aws_route_table.public_igw_route_table.id
}

# DB Subnet Group
resource "aws_db_subnet_group" "public_db_subnet_group" {
  name       = "public-db-subnet-group"
  subnet_ids = local.vpc_subnets

  tags = {
    Name = "DB subnet group associated with private vpc subnet"
  }
}
