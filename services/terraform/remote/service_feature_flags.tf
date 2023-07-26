locals {
  feature_flags_image_tag      = "0.1"
  feature_flags_container_name = "feature-flags-server"
  feature_flags_container_port = 50051
  feature_flags_server_image   = "commapp/feature-flags:${local.feature_flags_image_tag}"
}

# Task definition - defines container resources, ports,
# environment variables, docker image etc.
resource "aws_ecs_task_definition" "feature_flags" {
  family = "feature-flags-service-task-def"
  container_definitions = jsonencode([
    {
      name      = local.feature_flags_container_name
      image     = local.feature_flags_server_image
      essential = true
      portMappings = [
        {
          name          = "feature-flags-50051-http"
          containerPort = local.feature_flags_container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = "info"
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/feature-flags-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.feature_flags_service.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["EC2", "FARGATE"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = true
}

# ECS Service - defines task scaling, load balancer connection,
# network configuration etc.
resource "aws_ecs_service" "feature_flags" {
  name        = "feature-flags-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.feature_flags.arn
  force_new_deployment = true

  desired_count = 1
  # Allow external changes without Terraform plan difference
  # We can freely specify replica count in AWS Console
  lifecycle {
    ignore_changes = [desired_count]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.feature_flags_ecs.arn
    container_name   = local.feature_flags_container_name
    container_port   = local.feature_flags_container_port
  }

  network_configuration {
    assign_public_ip = true
    security_groups = [
      aws_security_group.feature_flags.id,
    ]
    subnets = [
      aws_subnet.public_a.id,
      aws_subnet.public_b.id,
      aws_subnet.public_c.id,
    ]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

# Running service instances are registered here
# to be accessed by the load balancer
resource "aws_lb_target_group" "feature_flags_ecs" {
  name     = "feature-flags-ecs-tg"
  port     = local.feature_flags_container_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.default.id

  # ECS Fargate requires target type set to IP
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    # The features endpoint should return HTTP 400 
    # if no platform, staff, code version is specified
    path    = "/features"
    matcher = "200-499"
  }
}

# Security group to configure access to the service
resource "aws_security_group" "feature_flags" {
  name   = "feature-flags-service-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.feature_flags_container_port
    to_port     = local.feature_flags_container_port
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
resource "aws_lb" "feature_flags" {
  load_balancer_type = "application"
  name               = "feature-flags-service-lb"
  internal           = false
  #security_groups    = [aws_security_group.feature_flags.id]
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "feature_flags_https" {
  load_balancer_arn = aws_lb.feature_flags.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.feature_flags.arn

  default_action {
    type = "forward"

    forward {
      # ECS target group
      target_group {
        arn    = aws_lb_target_group.feature_flags_ecs.arn
        weight = 10
      }

      # Legacy EC2 Target
      target_group {
        arn    = data.aws_lb_target_group.feature_flags_legacy_ec2.arn
        weight = 0
      }
    }
  }

  lifecycle {
    # Required only for existing resources to avoid plan difference
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]
  }
}

# SSL Certificate
data "aws_acm_certificate" "feature_flags" {
  domain   = "feature-flags.commtechnologies.org"
  statuses = ["ISSUED"]
}

# Legacy EC2 instance target
data "aws_lb_target_group" "feature_flags_legacy_ec2" {
  name = "feature-flags-service-tg"
}

# Required for Route53 DNS record
output "feature_flags_load_balancer_dns_name" {
  value = aws_lb.feature_flags.dns_name
}
