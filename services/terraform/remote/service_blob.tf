locals {
  blob_service_image_tag           = local.is_staging ? "latest" : "0.2.0"
  blob_service_container_name      = "blob-service-server"
  blob_service_server_image        = "commapp/blob-server:${local.blob_service_image_tag}"
  blob_service_container_http_port = 51001
  blob_service_container_grpc_port = 50051
  blob_service_grpc_public_port    = 50053
  blob_service_domain_name         = "blob.${local.root_domain}"
  blob_service_s3_bucket           = "commapp-blob${local.s3_bucket_name_suffix}"
}

resource "aws_ecs_task_definition" "blob_service" {
  family = "blob-service-task-def"
  container_definitions = jsonencode([
    {
      name      = local.blob_service_container_name
      image     = local.blob_service_server_image
      essential = true
      portMappings = [
        {
          name          = "blob-service-ecs-http"
          containerPort = local.blob_service_container_http_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
        {
          name          = "blob-service-ecs-grpc"
          containerPort = local.blob_service_container_grpc_port
          protocol      = "tcp"
          appProtocol   = "grpc"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = "info"
        },
        {
          name  = "BLOB_S3_BUCKET_NAME",
          value = local.blob_service_s3_bucket
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/blob-service-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "bridge"
  cpu                      = "512"
  memory                   = "512"
  requires_compatibilities = ["EC2"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = false
}

resource "aws_ecs_service" "blob_service" {
  name        = "blob-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "EC2"

  task_definition      = aws_ecs_task_definition.blob_service.arn
  force_new_deployment = true

  desired_count = 1

  lifecycle {
    ignore_changes = [desired_count]
  }

  # HTTP
  load_balancer {
    target_group_arn = aws_lb_target_group.blob_service_http.arn
    container_name   = local.blob_service_container_name
    container_port   = local.blob_service_container_http_port
  }

  # gRPC
  load_balancer {
    target_group_arn = aws_lb_target_group.blob_service_grpc.arn
    container_name   = local.blob_service_container_name
    container_port   = local.blob_service_container_grpc_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
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

  ingress {
    from_port   = local.blob_service_container_grpc_port
    to_port     = local.blob_service_container_grpc_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "gRPC port"
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

resource "aws_lb_target_group" "blob_service_http" {
  name     = "blob-service-ecs-http-tg"
  port     = local.blob_service_container_http_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.default.id

  # ECS Fargate requires target type set to IP
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200-499"
  }
}

resource "aws_lb_target_group" "blob_service_grpc" {
  name             = "blob-service-ecs-grpc-tg"
  port             = local.blob_service_container_grpc_port
  protocol         = "HTTP"
  protocol_version = "GRPC"
  vpc_id           = aws_vpc.default.id

  # The "bridge" network mode requires target type set to instance
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
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
    type = "forward"

    # TODO: Currently weights are set to direct 100% traffic
    # to the legacy instance
    forward {
      # ECS target group
      target_group {
        arn    = aws_lb_target_group.blob_service_http.arn
        weight = 1
      }

      # Legacy EC2 Target
      dynamic "target_group" {
        for_each = data.aws_lb_target_group.blob_service_legacy_ec2
        content {
          arn    = target_group.value["arn"]
          weight = 0
        }
      }
    }
  }

  lifecycle {
    # Required only for existing resources to avoid plan difference
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]

    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.blob_service_http]
  }
}

resource "aws_lb_listener" "blob_service_grpc" {
  load_balancer_arn = aws_lb.blob_service.arn
  port              = local.blob_service_grpc_public_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.blob_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blob_service_grpc.arn
  }

  lifecycle {
    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.blob_service_grpc]
  }
}

# SSL Certificate
data "aws_acm_certificate" "blob_service" {
  domain   = local.blob_service_domain_name
  statuses = ["ISSUED"]
}

# Legacy EC2 instance target
data "aws_lb_target_group" "blob_service_legacy_ec2" {
  # We don't have legacy EC2 services in staging
  count = local.is_staging ? 0 : 1
  name  = "blob-service-http-tg"
}

# Required for Route53 DNS record
output "blob_service_load_balancer_dns_name" {
  value = aws_lb.blob_service.dns_name
}
