locals {
  vpc_id      = var.user_created_vpc ? aws_vpc.default[0].id : data.aws_vpc.default.id
  vpc_subnets = var.user_created_vpc ? [aws_subnet.public_1[0].id, aws_subnet.public_2[0].id] : [data.aws_subnets.default.ids[0], data.aws_subnets.default.ids[1]]
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      managed_by = "terraform"
    }
  }
}
