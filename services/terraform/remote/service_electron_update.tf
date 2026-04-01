locals {
  electron_update_container_name = "electron-update-server"
  electron_update_container_port = 80
  electron_update_server_image   = "commapp/electron-update-server:3.0"

  electron_update_domain_name = "electron-update.${local.root_domain}"
}

resource "aws_cloudwatch_log_group" "electron_update" {
  count = local.service_enabled.electron_update ? 1 : 0

  name              = "/ecs/electron-update-task-def"
  retention_in_days = 7
}

# Task definition - defines container resources, ports,
# environment variables, docker image etc.
resource "aws_ecs_task_definition" "electron_update" {
  count = local.service_enabled.electron_update ? 1 : 0

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
          "awslogs-group"         = aws_cloudwatch_log_group.electron_update[0].name
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
  count = local.service_enabled.electron_update ? 1 : 0

  name        = "electron-update"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.electron_update[0].arn
  force_new_deployment = true

  desired_count = local.fixed_count_service_desired_counts.electron_update

  dynamic "load_balancer" {
    for_each = aws_lb_target_group.electron_update_ecs[*]
    content {
      target_group_arn = load_balancer.value.arn
      container_name   = local.electron_update_container_name
      container_port   = local.electron_update_container_port
    }
  }

  network_configuration {
    assign_public_ip = true
    security_groups = [
      aws_security_group.electron_update[0].id,
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
  count = local.service_enabled.electron_update ? 1 : 0

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
  count = local.service_enabled.electron_update ? 1 : 0

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
  count = local.service_enabled.electron_update ? 1 : 0

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
  count             = local.service_enabled.electron_update ? 1 : 0
  load_balancer_arn = aws_lb.electron_update[0].arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.electron_update.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.electron_update_ecs[0].arn
  }

  lifecycle {
    # Required only for existing resources to avoid plan difference
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]
  }
}

# SSL Certificate
data "aws_acm_certificate" "electron_update" {
  domain   = local.electron_update_domain_name
  statuses = ["ISSUED"]
}
