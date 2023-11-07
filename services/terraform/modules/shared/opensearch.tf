variable "vpc" {}

variable "domain" {
  default = "identity-search-domain"
}
variable subnet_ids {
  default = []
}

data "aws_vpc" "identity-search" {
  count = var.is_dev ? 0 : 1 
  tags = {
    Name = var.vpc
  }
}

resource "aws_security_group" "identity-search" {
  count = var.is_dev ? 0 : 1 
  name        = "${var.vpc}-opensearch-${var.domain}"
  description = "Managed by Terraform"
  vpc_id      = var.is_dev ? null : data.aws_vpc.identity-search[count.index].id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"

    cidr_blocks = [
      data.aws_vpc.identity-search[count.index].cidr_block,
    ]
  }
}

resource "aws_opensearch_domain" "identity-search" {
  domain_name    = var.domain
  engine_version = "OpenSearch_1.0"

  cluster_config {
    instance_type          = "m3.medium.search"
    zone_awareness_enabled = true
  }

  vpc_options {
    subnet_ids = var.subnet_ids

    security_group_ids = var.is_dev ? [] : [aws_security_group.identity-search[0].id]
  }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }
}
