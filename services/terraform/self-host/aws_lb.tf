resource "aws_security_group" "lb_sg" {
  name        = "lb-sg"
  description = "Security group for keyserver load balancer"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb_target_group" "keyserver_service" {
  name     = "keyserver-service-ecs-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  # "awsvpc" network mode requires target type set to ip
  target_type = "ip"

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86500
    enabled         = true
  }

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200-299"
  }
}

resource "aws_lb" "keyserver_service" {
  load_balancer_type = "application"
  name               = "keyserver-service-lb"

  internal = false
  subnets = [
    data.aws_subnets.default.ids[0],
    data.aws_subnets.default.ids[1],
  ]
}

resource "aws_lb_listener" "keyserver_service" {
  load_balancer_arn = aws_lb.keyserver_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.keyserver_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keyserver_service.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.keyserver_service]
  }
}


data "aws_acm_certificate" "keyserver_service" {
  domain   = var.domain_name
  statuses = ["ISSUED"]
}

output "keyserver_service_load_balancer_dns_name" {
  value = aws_lb.keyserver_service.dns_name
}
