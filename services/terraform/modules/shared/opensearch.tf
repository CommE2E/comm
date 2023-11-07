variable "vpc" {}

variable "domain" {
  default = "identity-search-domain"
}

data "aws_vpc" "identity-search" {
  count = var.is_dev ? 0 : 1 
  tags = {
    Name = var.vpc
  }
}

data "aws_subnets" "identity-search" {
  count = var.is_dev ? 0 : 1 
  filter {
    name   = "vpc-id"
    values = var.is_dev ? null : [data.aws_vpc.identity-search[count.index].id] 
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

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

resource "aws_iam_service_linked_role" "identity-search" {
  count = var.is_dev ? 0 : 1 
  aws_service_name = "opensearchservice.amazonaws.com"
}

data "aws_iam_policy_document" "identity-search" {
  statement {
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["es:*"]
    resources = ["arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${var.domain}/*"]
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
    subnet_ids = var.is_dev ? [] : [
      data.aws_subnets.identity-search[0].ids[0],
      data.aws_subnets.identity-search[0].ids[1],
      data.aws_subnets.identity-search[0].ids[2],
    ]

    security_group_ids = var.is_dev ? [] : [aws_security_group.identity-search[0].id]
  }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }

  access_policies = var.is_dev ? "" : jsonencode(data.aws_iam_policy_document.identity-search)

  depends_on = [aws_iam_service_linked_role.identity-search]
}
