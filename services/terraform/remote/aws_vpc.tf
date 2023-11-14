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

# Subnets
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

resource "aws_subnet" "public_c" {
  vpc_id                  = aws_vpc.default.id
  cidr_block              = "172.31.32.0/20"
  availability_zone       = "us-east-2c"
  map_public_ip_on_launch = true
}

resource "aws_vpc_endpoint" "dynamodb_endpoint" {
  vpc_id = aws_vpc.default.id
  service_name = "com.amazonaws.us-east-2.dynamodb"
  vpc_endpoint_type = "Gateway"

  policy = <<POLICY
  {
  "Statement": [
      {
      "Action": "*",
      "Effect": "Allow",
      "Resource": "*",
      "Principal": "*"
      }
  ]
  }
  POLICY
}

resource "aws_vpc_endpoint_route_table_association" "dynamodb_endpoint" {
  vpc_endpoint_id = "${aws_vpc_endpoint.dynamodb_endpoint.id}"
  route_table_id  = "${aws_vpc.default.main_route_table_id}"
}

# These are described in AWS console as:
# > The following subnets have not been explicitly associated
# > with any route tables and are therefore associated with the main route table:
#
# TODO: Enable these associations when we are confident about them
# resource "aws_route_table_association" "public_a" {
#   subnet_id      = aws_subnet.public_a.id
#   route_table_id = aws_route_table.default.id
# }
# resource "aws_route_table_association" "public_b" {
#   subnet_id      = aws_subnet.public_b.id
#   route_table_id = aws_route_table.default.id
# }
# resource "aws_route_table_association" "public_c" {
#   subnet_id      = aws_subnet.public_c.id
#   route_table_id = aws_route_table.default.id
# }
