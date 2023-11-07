variable "domain" {
  default = "identity-search-domain"
}

resource "aws_security_group" "identity-search" {
  count = var.is_dev ? 0 : 1 
  name        = "${var.vpc_id}-opensearch-${var.domain}"
  description = "Managed by Terraform"
  vpc_id      = var.is_dev ? null : var.vpc_id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"

    cidr_blocks = ["0.0.0.0/0"]
    security_groups = ["${aws_security_group.search_index_lambda.id}"]
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
  
  # domain_endpoint_options {
  #   custom_endpoint_enabled = true
  #   custom_endpoint         = "opensearch.identity-search.com"
  # }

  advanced_options = {
    "rest.action.multi.allow_explicit_index" = "true"
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }
}

# data "aws_iam_policy_document" "identity-search" {
#   statement {
#     effect = "Allow"
# 
#     principals {
#       type        = "*"
#       identifiers = ["*"]
#     }
# 
#     actions   = ["es:*"]
#     resources = ["arn:aws:es:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:domain/${var.domain}/*"]
#      # resources = ["${aws_opensearch_domain.identity-search.arn}"]
# 
#     condition {
#       test     = "IpAddress"
#       variable = "aws:SourceIp"
#       values   = ["66.193.100.22/32"]
#     }
#   }
# }
