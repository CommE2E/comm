locals {
  enabled_endpoints = {
    for endpoint_name, endpoint in var.endpoints :
    endpoint_name => endpoint
    if endpoint.enabled
  }

  create_shared_public_ingress = (
    var.create_resources && length(local.enabled_endpoints) > 0
  )

  managed_target_group_endpoints = {
    for endpoint_name, endpoint in local.enabled_endpoints :
    endpoint_name => endpoint
    if endpoint.target_group_arn == null
  }

  external_target_group_endpoints = {
    for endpoint_name, endpoint in local.enabled_endpoints :
    endpoint_name => endpoint
    if endpoint.target_group_arn != null
  }

  listener_ports = toset([
    for endpoint in values(local.enabled_endpoints) :
    endpoint.listener_port
  ])

  listener_configs = {
    for listener_port in local.listener_ports :
    tostring(listener_port) => {
      listener_port = listener_port
      endpoint_keys = sort([
        for endpoint_name, endpoint in local.enabled_endpoints :
        endpoint_name if endpoint.listener_port == listener_port
      ])
      certificate_domains = sort(distinct([
        for endpoint_name, endpoint in local.enabled_endpoints :
        endpoint.certificate_domain if endpoint.listener_port == listener_port
      ]))
      ssl_policy = one(distinct([
        for endpoint_name, endpoint in local.enabled_endpoints :
        endpoint.ssl_policy if endpoint.listener_port == listener_port
      ]))
    }
  }

  endpoint_target_group_arns = merge(
    {
      for endpoint_name, target_group in aws_lb_target_group.endpoint :
      endpoint_name => target_group.arn
    },
    {
      for endpoint_name, endpoint in local.external_target_group_endpoints :
      endpoint_name => endpoint.target_group_arn
    },
  )

  listener_rule_configs = merge([
    for listener_key, listener in local.listener_configs :
    {
      for index, endpoint_name in listener.endpoint_keys :
      endpoint_name => {
        listener_key = listener_key
        hostname     = local.enabled_endpoints[endpoint_name].hostname
        priority     = 100 + index
      }
      if length(listener.endpoint_keys) > 1
    }
  ]...)

  listener_certificate_configs = merge([
    for listener_key, listener in local.listener_configs :
    {
      for certificate_domain in slice(
        listener.certificate_domains,
        1,
        length(listener.certificate_domains),
      ) :
      "${listener_key}:${certificate_domain}" => {
        listener_key       = listener_key
        certificate_domain = certificate_domain
      }
    }
  ]...)

  certificate_domains = toset([
    for endpoint in values(local.enabled_endpoints) :
    endpoint.certificate_domain
  ])
}

data "aws_acm_certificate" "endpoint" {
  for_each = (
    local.create_shared_public_ingress
    ? local.certificate_domains
    : toset([])
  )

  domain   = each.value
  statuses = ["ISSUED"]
}

resource "aws_security_group" "public_ingress" {
  count = local.create_shared_public_ingress ? 1 : 0

  name        = "${var.load_balancer_name}-sg"
  description = "Security group for the shared public ALB"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = local.listener_configs

    content {
      from_port   = ingress.value.listener_port
      to_port     = ingress.value.listener_port
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "public_ingress" {
  count = local.create_shared_public_ingress ? 1 : 0

  load_balancer_type = "application"
  name               = var.load_balancer_name
  internal           = false
  security_groups    = [aws_security_group.public_ingress[0].id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "endpoint" {
  for_each = (
    local.create_shared_public_ingress
    ? local.managed_target_group_endpoints
    : {}
  )

  name             = each.value.target_group_name
  port             = each.value.target_group_port
  protocol         = each.value.target_group_protocol
  protocol_version = each.value.target_group_protocol_version
  vpc_id           = var.vpc_id
  target_type      = "ip"

  stickiness {
    type            = each.value.target_group_stickiness_type
    cookie_duration = each.value.target_group_stickiness_cookie_duration
    enabled         = each.value.target_group_stickiness_enabled
  }

  health_check {
    enabled             = true
    healthy_threshold   = each.value.target_group_health_check_healthy_threshold
    unhealthy_threshold = each.value.target_group_health_check_unhealthy_threshold

    protocol = each.value.target_group_health_check_protocol
    port     = each.value.target_group_health_check_port
    path     = each.value.target_group_health_check_path
    matcher  = each.value.target_group_health_check_matcher
  }
}

resource "aws_lb_listener" "port" {
  for_each = (
    local.create_shared_public_ingress
    ? local.listener_configs
    : {}
  )

  load_balancer_arn = aws_lb.public_ingress[0].arn
  port              = each.value.listener_port
  protocol          = "HTTPS"
  ssl_policy        = each.value.ssl_policy
  certificate_arn = data.aws_acm_certificate.endpoint[
    each.value.certificate_domains[0]
  ].arn

  dynamic "default_action" {
    for_each = length(each.value.endpoint_keys) > 1 ? [1] : []

    content {
      type = "fixed-response"

      fixed_response {
        content_type = "text/plain"
        message_body = "Not Found"
        status_code  = "404"
      }
    }
  }

  dynamic "default_action" {
    for_each = length(each.value.endpoint_keys) == 1 ? [1] : []

    content {
      type = "forward"
      target_group_arn = local.endpoint_target_group_arns[
        each.value.endpoint_keys[0]
      ]
    }
  }
}

resource "aws_lb_listener_certificate" "port" {
  for_each = (
    local.create_shared_public_ingress
    ? local.listener_certificate_configs
    : {}
  )

  listener_arn = aws_lb_listener.port[each.value.listener_key].arn
  certificate_arn = data.aws_acm_certificate.endpoint[
    each.value.certificate_domain
  ].arn
}

resource "aws_lb_listener_rule" "host_header" {
  for_each = (
    local.create_shared_public_ingress
    ? local.listener_rule_configs
    : {}
  )

  listener_arn = aws_lb_listener.port[each.value.listener_key].arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = local.endpoint_target_group_arns[each.key]
  }

  condition {
    host_header {
      values = [each.value.hostname]
    }
  }
}
