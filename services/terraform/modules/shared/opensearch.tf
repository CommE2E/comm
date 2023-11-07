variable "vpc" {}

variable "cidr_block" {}

variable "domain" {
  default = "identity-search-domain"
}
variable subnet_ids { }

resource "aws_security_group" "identity-search" {
  count = var.is_dev ? 0 : 1 
  name        = "${var.vpc}-opensearch-${var.domain}"
  description = "Managed by Terraform"
  vpc_id      = var.is_dev ? null : var.vpc

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"

    cidr_blocks = [
      var.cidr_block
    ]
  }
}

resource "aws_opensearch_domain" "identity-search" {
  domain_name    = var.domain
  engine_version = "OpenSearch_1.0"

  cluster_config {
    instance_type          = "t3.medium.search"
  }

  vpc_options {
    subnet_ids = var.subnet_ids

    security_group_ids = var.is_dev ? [] : [aws_security_group.identity-search[0].id]
  }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }
}
