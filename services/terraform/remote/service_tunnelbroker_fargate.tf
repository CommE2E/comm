# Fargate task definition
resource "aws_ecs_task_definition" "tunnelbroker_fargate" {
  family = "tunnelbroker-fargate-task-def"
  container_definitions = jsonencode([
    {
      name      = local.tunnelbroker_config.container_name
      image     = local.tunnelbroker_docker_image
      essential = true
      portMappings = [
        {
          name          = "tunnelbroker_ws"
          containerPort = local.tunnelbroker_config.websocket_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
        {
          name          = local.tunnelbroker_config.grpc_port_name
          containerPort = local.tunnelbroker_config.grpc_port
          protocol      = "tcp"
          appProtocol   = "grpc"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,tunnelbroker=debug,comm_lib=debug" : "info"
        },
        {
          name  = "AMQP_URI",
          value = local.amqp_endpoint
        },
        {
          name  = "AMQP_USERNAME"
          value = "comm"
        },
        {
          name  = "AMQP_PASSWORD"
          value = nonsensitive(local.rabbitmq_password)
        },
        {
          name  = "COMM_TUNNELBROKER_IDENTITY_ENDPOINT",
          value = local.identity_fargate_url
        },
        {
          name  = "BLOB_SERVICE_URL",
          value = local.blob_fargate_url
        },
        {
          name  = "BLOB_SERVICE_PUBLIC_URL",
          value = "https://${local.blob_service_domain_name}"
        },
        {
          name  = "COMM_SERVICES_USE_JSON_LOGS",
          value = local.comm_services_use_json_logs
        },
        {
          name  = "REDACT_SENSITIVE_DATA",
          value = local.is_staging ? "false" : "true"
        }
      ]
      secrets = [
        {
          name      = "APNS_CONFIG"
          valueFrom = data.aws_secretsmanager_secret.tunnelbroker_apns.arn
        },
        {
          name      = "FCM_CONFIG"
          valueFrom = data.aws_secretsmanager_secret.tunnelbroker_fcm.arn
        },
        {
          name      = "WEB_PUSH_CONFIG"
          valueFrom = data.aws_secretsmanager_secret.tunnelbroker_web_push.arn
        },
        {
          name      = "WNS_CONFIG"
          valueFrom = data.aws_secretsmanager_secret.tunnelbroker_wns.arn
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/tunnelbroker-fargate-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = local.is_staging ? "256" : "512"
  memory                   = local.is_staging ? "512" : "1024"
  requires_compatibilities = ["FARGATE"]

  skip_destroy = true
}

# Fargate ECS Service
resource "aws_ecs_service" "tunnelbroker_fargate" {
  name        = "tunnelbroker-fargate"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.tunnelbroker_fargate.arn
  force_new_deployment = true

  network_configuration {
    subnets = [
      aws_subnet.public_a.id,
      aws_subnet.public_b.id,
      aws_subnet.public_c.id,
    ]
    security_groups  = [aws_security_group.tunnelbroker.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = "${local.tunnelbroker_config.local_dns_name}-fargate"
      port_name      = local.tunnelbroker_config.grpc_port_name
      client_alias {
        port     = local.tunnelbroker_config.grpc_port
        dns_name = "${local.tunnelbroker_config.local_dns_name}-fargate"
      }
    }
  }

  # Websocket
  load_balancer {
    target_group_arn = aws_lb_target_group.tunnelbroker_ws_fargate.arn
    container_name   = local.tunnelbroker_config.container_name
    container_port   = local.tunnelbroker_config.websocket_port
  }

  # gRPC (only exists in staging)
  dynamic "load_balancer" {
    for_each = aws_lb_listener.tunnelbroker_grpc
    content {
      target_group_arn = aws_lb_target_group.tunnelbroker_grpc_fargate.arn
      container_name   = local.tunnelbroker_config.container_name
      container_port   = local.tunnelbroker_config.grpc_port
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Fargate WebSocket target group
resource "aws_lb_target_group" "tunnelbroker_ws_fargate" {
  name             = "tunnelbroker-ws-fargate-tg"
  port             = local.tunnelbroker_config.websocket_port
  protocol         = "HTTP"
  protocol_version = "HTTP1"
  vpc_id           = aws_vpc.default.id
  target_type      = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200"
  }
}

# Fargate gRPC target group
resource "aws_lb_target_group" "tunnelbroker_grpc_fargate" {
  name             = "tunnelbroker-grpc-fargate-tg"
  port             = local.tunnelbroker_config.grpc_port
  protocol         = "HTTP"
  protocol_version = "GRPC"
  vpc_id           = aws_vpc.default.id
  target_type      = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Auto-scaling for Fargate service
module "tunnelbroker_fargate_autoscaling" {
  source = "../modules/fargate-autoscaling"

  create_resources = true
  service_name     = aws_ecs_service.tunnelbroker_fargate.name
  cluster_name     = aws_ecs_cluster.comm_services.name

  min_capacity  = 1
  max_capacity  = 8
  cpu_target    = 30.0
  memory_target = 40.0

  scale_in_cooldown  = 300 # 5 minutes
  scale_out_cooldown = 60  # 1 minute
}