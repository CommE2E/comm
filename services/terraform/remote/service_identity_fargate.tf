# Fargate task definition
resource "aws_ecs_task_definition" "identity_service_fargate" {
  family = "identity-service-fargate-task-def"
  container_definitions = jsonencode([
    {
      name      = local.identity_service_container_name
      image     = local.identity_service_server_image
      essential = true
      portMappings = [
        {
          name          = local.identity_sc_port_name
          containerPort = local.identity_service_container_grpc_port
          protocol      = "tcp"
          # Leave empty for mixed HTTP/gRPC traffic
        },
        {
          name          = local.identity_sc_ws_port_name
          containerPort = local.identity_service_container_ws_port
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,identity=debug,comm_lib=debug" : "info"
        },
        {
          name  = "KEYSERVER_PUBLIC_KEY"
          value = nonsensitive(local.secrets["keyserverPublicKey"])
        },
        {
          name  = "TUNNELBROKER_GRPC_ENDPOINT"
          value = local.tunnelbroker_fargate_grpc_url
        },
        {
          name  = "BACKUP_SERVICE_URL",
          value = local.backup_fargate_url
        },
        {
          name  = "BLOB_SERVICE_URL",
          value = local.blob_fargate_url
        },
        {
          name  = "OPENSEARCH_ENDPOINT"
          value = module.shared.opensearch_domain_identity.endpoint
        },
        {
          name  = "ALLOW_ORIGIN_LIST"
          value = local.is_staging ? local.staging_allow_origin_list : local.production_allow_origin_list
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
          name      = "OPAQUE_SERVER_SETUP"
          valueFrom = data.aws_secretsmanager_secret.identity_server_setup.arn
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/identity-service-fargate-task-def"
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
  memory                   = local.is_staging ? "512" : "2048"
  requires_compatibilities = ["FARGATE"]

  skip_destroy = true
}

# Fargate ECS Service
resource "aws_ecs_service" "identity_service_fargate" {
  name        = "identity-service-fargate"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.identity_service_fargate.arn
  force_new_deployment = true

  network_configuration {
    subnets = [
      aws_subnet.public_a.id,
      aws_subnet.public_b.id,
      aws_subnet.public_c.id,
    ]
    security_groups  = [aws_security_group.identity_service.id]
    assign_public_ip = true
  }

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = "${local.identity_sc_dns_name}-fargate"
      port_name      = local.identity_sc_port_name
      client_alias {
        port     = local.identity_service_container_grpc_port
        dns_name = "${local.identity_sc_dns_name}-fargate"
      }
    }
  }

  # WebSocket
  load_balancer {
    target_group_arn = aws_lb_target_group.identity_service_ws_fargate.arn
    container_name   = local.identity_service_container_name
    container_port   = local.identity_service_container_ws_port
  }

  # gRPC
  load_balancer {
    target_group_arn = aws_lb_target_group.identity_service_grpc_fargate.arn
    container_name   = local.identity_service_container_name
    container_port   = local.identity_service_container_grpc_port
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

# Fargate gRPC target group
resource "aws_lb_target_group" "identity_service_grpc_fargate" {
  name             = "identity-service-grpc-fargate-tg"
  port             = local.identity_service_container_grpc_port
  protocol         = "HTTP"
  protocol_version = "HTTP2"
  vpc_id           = aws_vpc.default.id
  target_type      = "ip"

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 10
    enabled         = true
  }

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    port     = "traffic-port"
    path     = "/"
    matcher  = "200-499"
  }
}

# Fargate WebSocket target group
resource "aws_lb_target_group" "identity_service_ws_fargate" {
  name             = "identity-service-ws-fargate-tg"
  port             = local.identity_service_container_ws_port
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

# Auto-scaling for Fargate service
module "identity_service_fargate_autoscaling" {
  source = "../modules/fargate-autoscaling"

  create_resources = true
  service_name     = aws_ecs_service.identity_service_fargate.name
  cluster_name     = aws_ecs_cluster.comm_services.name

  min_capacity  = local.is_staging ? 1 : 2
  max_capacity  = 6
  cpu_target    = 35.0
  memory_target = 45.0

  scale_in_cooldown  = 300 # 5 minutes
  scale_out_cooldown = 60  # 1 minute
}