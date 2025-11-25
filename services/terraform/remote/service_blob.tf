locals {
  blob_service_image_tag      = local.is_staging ? "1.4.2" : "1.4.2"
  blob_service_container_name = "blob-service-server"
  blob_service_server_image   = "commapp/blob-server:${local.blob_service_image_tag}"

  # HTTP port & configuration for ECS Service Connect
  blob_service_container_http_port = 50053
  blob_sc_port_name                = "blob-service-ecs-http"
  blob_sc_dns_name                 = "blob-service"

  # URL accessible by other services in the same Service Connect namespace
  # This renders to 'http://blob-service:50053'
  blob_local_url = "http://${local.blob_sc_dns_name}:${local.blob_service_container_http_port}"

  # Fargate-specific URL for Fargate services to communicate with Fargate blob service
  blob_fargate_url = "http://${local.blob_sc_dns_name}-fargate:${local.blob_service_container_http_port}"

  blob_service_container_grpc_port = 50051
  blob_service_grpc_public_port    = 50053
  blob_service_domain_name         = "blob.${local.root_domain}"
  blob_service_s3_bucket           = "commapp-blob${local.s3_bucket_name_suffix}"
}



# Security group to configure access to the service
resource "aws_security_group" "blob_service" {
  name   = "blob-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.blob_service_container_http_port
    to_port     = local.blob_service_container_http_port
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
resource "aws_lb" "blob_service" {
  load_balancer_type = "application"
  name               = "blob-service-lb"
  internal           = false
  #security_groups    = [aws_security_group.blob_service.id]
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "blob_service_https" {
  load_balancer_arn = aws_lb.blob_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.blob_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blob_service_http_fargate.arn
  }

  lifecycle {
    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.blob_service_http_fargate]
  }
}

# SSL Certificate
data "aws_acm_certificate" "blob_service" {
  domain   = local.blob_service_domain_name
  statuses = ["ISSUED"]
}
