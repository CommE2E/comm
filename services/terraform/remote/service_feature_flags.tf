locals {
  feature_flags_image_tag      = local.is_staging ? "latest" : "0.1.1"
  feature_flags_container_name = "feature-flags-server"
  feature_flags_container_port = 50055
  feature_flags_server_image   = "commapp/feature-flags:${local.feature_flags_image_tag}"
  feature_flags_domain_name    = "feature-flags.${local.root_domain}"
}

resource "aws_cloudwatch_log_group" "feature_flags" {
  count = local.service_enabled.feature_flags ? 1 : 0

  name              = "/ecs/feature-flags-task-def"
  retention_in_days = 7
}

# Task definition - defines container resources, ports,
# environment variables, docker image etc.
resource "aws_ecs_task_definition" "feature_flags" {
  count = local.service_enabled.feature_flags ? 1 : 0

  family = "feature-flags-service-task-def"
  container_definitions = jsonencode([
    {
      name      = local.feature_flags_container_name
      image     = local.feature_flags_server_image
      essential = true
      portMappings = [
        {
          name          = "feature-flags-http"
          containerPort = local.feature_flags_container_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,feature_flags=debug,comm_lib=debug" : "info"
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-group"         = aws_cloudwatch_log_group.feature_flags[0].name
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
  count = local.service_enabled.feature_flags ? 1 : 0

  name        = "feature-flags-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.feature_flags[0].arn
  force_new_deployment = true

  desired_count = local.fixed_count_service_desired_counts.feature_flags

  dynamic "load_balancer" {
    for_each = local.service_enabled.feature_flags ? [
      module.shared_public_ingress.target_group_arns["feature_flags_https"]
    ] : []
    content {
      target_group_arn = load_balancer.value
      container_name   = local.feature_flags_container_name
      container_port   = local.feature_flags_container_port
    }
  }

  network_configuration {
    assign_public_ip = true
    security_groups = [
      aws_security_group.feature_flags[0].id,
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
resource "aws_security_group" "feature_flags" {
  count = local.service_enabled.feature_flags ? 1 : 0

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
