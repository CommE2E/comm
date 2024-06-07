# VPC
#
data "aws_vpc" "default" {
  default = true
}

# Public Subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Internet Gateway
data "aws_internet_gateway" "default" {
  filter {
    name   = "attachment.vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Route Table for Internet Gateway
resource "aws_route_table" "public_igw_route_table" {
  vpc_id = data.aws_vpc.default.id

  route {
    cidr_block = "${var.allowed_ip}/32"
    gateway_id = data.aws_internet_gateway.default.id
  }
}

resource "aws_route_table_association" "public_1_igw_route_association" {
  subnet_id      = data.aws_subnets.default.ids[0]
  route_table_id = aws_route_table.public_igw_route_table.id
}

resource "aws_route_table_association" "public_2_igw_route_association" {
  subnet_id      = data.aws_subnets.default.ids[1]
  route_table_id = aws_route_table.public_igw_route_table.id
}

# DB Subnet Group
resource "aws_db_subnet_group" "public_db_subnet_group" {
  name       = "public-db-subnet-group"
  subnet_ids = [data.aws_subnets.default.ids[0], data.aws_subnets.default.ids[1]]

  tags = {
    Name = "DB subnet group associated with private vpc subnet"
  }
}
