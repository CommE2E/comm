# VPC
resource "aws_vpc" "default" {
  cidr_block           = "172.31.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
}

# Public Subnets
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.0.0/20"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.16.0/20"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = true
}

# Internet Gateway
resource "aws_internet_gateway" "default" {
  vpc_id = aws_vpc.default.id
}

# Route Table for Internet Gateway
resource "aws_route_table" "public_igw_route_table" {
  vpc_id = aws_vpc.default.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.default.id
  }
}

resource "aws_route_table_association" "public_a_igw_route_association" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_igw_route_table.id
}

resource "aws_route_table_association" "public_b_igw_route_association" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_igw_route_table.id
}
