# Fargate task definition (staging only)
resource "aws_ecs_task_definition" "backup_service_fargate" {
  count  = local.is_staging ? 1 : 0
  family = "backup-service-fargate-task-def"
  container_definitions = jsonencode([
    {
      name      = local.backup_service_container_name
      image     = local.backup_service_server_image
      essential = true
      portMappings = [
        {
          name          = local.backup_sc_port_name
          containerPort = local.backup_service_container_http_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,backup=debug,comm_lib=debug" : "info"
        },
        {
          name  = "BLOB_SERVICE_URL",
          value = local.blob_fargate_url
        },
        {
          name  = "IDENTITY_SERVICE_ENDPOINT",
          value = local.identity_fargate_url
        },
        {
          name  = "COMM_SERVICES_USE_JSON_LOGS",
          value = local.comm_services_use_json_logs
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/backup-service-fargate-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.backup_service.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["FARGATE"]

  skip_destroy = true
}

# Fargate ECS Service (staging only)
resource "aws_ecs_service" "backup_service_fargate" {
  count       = local.is_staging ? 1 : 0
  name        = "backup-service-fargate"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.backup_service_fargate[0].arn
  force_new_deployment = true

  network_configuration {
    subnets = [
      aws_subnet.public_a.id,
      aws_subnet.public_b.id,
      aws_subnet.public_c.id,
    ]
    security_groups  = [aws_security_group.backup_service.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = "${local.backup_sc_dns_name}-fargate"
      port_name      = local.backup_sc_port_name
      client_alias {
        port     = local.backup_service_container_http_port
        dns_name = "${local.backup_sc_dns_name}-fargate"
      }
    }
  }

  # HTTP
  load_balancer {
    target_group_arn = aws_lb_target_group.backup_service_http_fargate[0].arn
    container_name   = local.backup_service_container_name
    container_port   = local.backup_service_container_http_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  enable_execute_command  = true
  enable_ecs_managed_tags = true
}

# Fargate HTTP target group (staging only)
resource "aws_lb_target_group" "backup_service_http_fargate" {
  count       = local.is_staging ? 1 : 0
  name        = "backup-service-http-fargate-tg"
  port        = local.backup_service_container_http_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200-204"
  }
}

# Auto-scaling for Fargate service (staging only)
module "backup_service_fargate_autoscaling" {
  source = "../modules/fargate-autoscaling"

  create_resources = local.is_staging
  service_name     = local.is_staging ? aws_ecs_service.backup_service_fargate[0].name : ""
  cluster_name     = aws_ecs_cluster.comm_services.name

  min_capacity  = 1
  max_capacity  = 4
  cpu_target    = 40.0
  memory_target = 50.0

  scale_in_cooldown  = 300 # 5 minutes
  scale_out_cooldown = 60  # 1 minute
}