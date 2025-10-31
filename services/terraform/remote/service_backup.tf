locals {
  backup_service_image_tag      = local.is_staging ? "0.7.4" : "0.7.4"
  backup_service_container_name = "backup-service-server"
  backup_service_server_image   = "commapp/backup-server:${local.backup_service_image_tag}"
  backup_service_domain_name    = "backup.${local.root_domain}"

  # HTTP port & configuration for ECS Service Connect
  backup_service_container_http_port = 50052
  backup_sc_port_name                = "backup-service-ecs-http"
  backup_sc_dns_name                 = "backup-service"

  # URL accessible by other services in the same Service Connect namespace
  # This renders to 'http://backup-service:50052'
  backup_local_url = "http://${local.backup_sc_dns_name}:${local.backup_service_container_http_port}"

  # Fargate-specific URL for Fargate services to communicate with Fargate backup service
  backup_fargate_url = "http://${local.backup_sc_dns_name}-fargate:${local.backup_service_container_http_port}"
}



# Security group to configure access to the service
resource "aws_security_group" "backup_service" {
  name   = "backup-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.backup_service_container_http_port
    to_port     = local.backup_service_container_http_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP port"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}


# Load Balancer
resource "aws_lb" "backup_service" {
  load_balancer_type = "application"
  name               = "backup-service-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "backup_service_https" {
  load_balancer_arn = aws_lb.backup_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.backup_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backup_service_http_fargate.arn
  }

  lifecycle {
    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.backup_service_http_fargate]
  }
}

# SSL Certificate
data "aws_acm_certificate" "backup_service" {
  domain   = local.backup_service_domain_name
  statuses = ["ISSUED"]
}
