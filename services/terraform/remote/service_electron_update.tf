locals {
  electron_update_container_name = "electron-update-server"
  electron_update_container_port = 80
  electron_update_server_image   = "commapp/electron-update-server:1.0"
}

# Task definition - defines container resources, ports,
# environment variables, docker image etc.
resource "aws_ecs_task_definition" "electron_update" {
  family = "electron-update-task-def"
  container_definitions = jsonencode([
    {
      name      = local.electron_update_container_name
      image     = local.electron_update_server_image
      essential = true
      portMappings = [
        {
          name          = "electron-update-80-80-http"
          containerPort = local.electron_update_container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/electron-update-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = null
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["EC2", "FARGATE"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = false
}

# ECS Service - defines task scaling, load balancer connection,
# network configuration etc.
resource "aws_ecs_service" "electron_update" {
  name        = "electron-update"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.electron_update.arn
  force_new_deployment = true

  desired_count = 1
  # Allow external changes without Terraform plan difference
  # We can freely specify replica count in AWS Console
  lifecycle {
    ignore_changes = [desired_count]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.electron_update_ecs.arn
    container_name   = local.electron_update_container_name
    container_port   = local.electron_update_container_port
  }

  network_configuration {
    assign_public_ip = true
    security_groups = [
      aws_security_group.electron_update.id,
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

# Security group to configure access to the service
resource "aws_security_group" "electron_update" {
  name   = "electron-update-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.electron_update_container_port
    to_port     = local.electron_update_container_port
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

# Running service instances are registered here
# to be accessed by the load balancer
resource "aws_lb_target_group" "electron_update_ecs" {
  name     = "electron-update-ecs-tg"
  port     = local.electron_update_container_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.default.id

  # ECS Fargate requires target type set to IP
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    # Hazel homepage returns some HTML that can be used as a health check
    path    = "/"
    matcher = "200"
  }
}

# Load Balancer
resource "aws_lb" "electron_update" {
  load_balancer_type = "application"
  name               = "electron-update-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_c.id,

    # For some reason we don't use this subnet here
    # aws_subnet.public_b.id,
  ]
}

resource "aws_lb_listener" "electron_update_https" {
  load_balancer_arn = aws_lb.electron_update.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.electron_update.arn

  default_action {
    type = "forward"
    forward {
      # ECS target group
      target_group {
        arn    = aws_lb_target_group.electron_update_ecs.arn
        weight = 10
      }

      # Legacy EC2 Target
      target_group {
        arn    = data.aws_lb_target_group.electron_update_legacy_ec2.arn
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
data "aws_acm_certificate" "electron_update" {
  domain   = "electron-update.commtechnologies.org"
  statuses = ["ISSUED"]
}

# Legacy EC2 instance target
data "aws_lb_target_group" "electron_update_legacy_ec2" {
  name = "electron-update-tg"
}

# Required for Route53 DNS record
output "electron_update_load_balancer_dns_name" {
  value = aws_lb.electron_update.dns_name
}
