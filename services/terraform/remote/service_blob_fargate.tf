# Fargate task definition
resource "aws_ecs_task_definition" "blob_service_fargate" {
  family = "blob-service-fargate-task-def"
  container_definitions = jsonencode([
    {
      name      = local.blob_service_container_name
      image     = local.blob_service_server_image
      essential = true
      portMappings = [
        {
          name          = local.blob_sc_port_name
          containerPort = local.blob_service_container_http_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,blob=debug,comm_lib=debug" : "info"
        },
        {
          name  = "BLOB_S3_BUCKET_NAME",
          value = local.blob_service_s3_bucket
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
          "awslogs-group"         = "/ecs/blob-service-fargate-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["FARGATE"]

  skip_destroy = true
}

# Fargate ECS Service
resource "aws_ecs_service" "blob_service_fargate" {
  name        = "blob-service-fargate"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.blob_service_fargate.arn
  force_new_deployment = true

  network_configuration {
    subnets = [
      aws_subnet.public_a.id,
      aws_subnet.public_b.id,
      aws_subnet.public_c.id,
    ]
    security_groups  = [aws_security_group.blob_service.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = "${local.blob_sc_dns_name}-fargate"
      port_name      = local.blob_sc_port_name
      client_alias {
        port     = local.blob_service_container_http_port
        dns_name = "${local.blob_sc_dns_name}-fargate"
      }
    }
  }

  # HTTP
  load_balancer {
    target_group_arn = aws_lb_target_group.blob_service_http_fargate.arn
    container_name   = local.blob_service_container_name
    container_port   = local.blob_service_container_http_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Fargate HTTP target group
resource "aws_lb_target_group" "blob_service_http_fargate" {
  name        = "blob-service-http-fargate-tg"
  port        = local.blob_service_container_http_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200-499"
  }
}

# Auto-scaling for Fargate service
module "blob_service_fargate_autoscaling" {
  source = "../modules/fargate-autoscaling"

  create_resources = true
  service_name     = aws_ecs_service.blob_service_fargate.name
  cluster_name     = aws_ecs_cluster.comm_services.name

  min_capacity  = 1
  max_capacity  = 4
  cpu_target    = 35.0
  memory_target = 45.0

  scale_in_cooldown  = 300 # 5 minutes
  scale_out_cooldown = 60  # 1 minute
}