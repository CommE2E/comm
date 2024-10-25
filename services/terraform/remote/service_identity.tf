locals {
  identity_service_image_tag      = local.is_staging ? "0.44" : "0.43"
  identity_service_server_image   = "commapp/identity-server:${local.identity_service_image_tag}"
  identity_service_container_name = "identity-server"

  # Port that the container is listening on
  identity_service_container_grpc_port = 50054
  identity_sc_port_name                = "identity-service-ecs-grpc"
  identity_sc_dns_name                 = "identity-service"

  # Port that Websocket server listens on
  identity_service_container_ws_port = 51004
  identity_sc_ws_port_name           = "identity-service-ecs-ws"

  # URL accessible by other services in the same Service Connect namespace
  # This renders to e.g. 'http://identity-service:50054'
  identity_local_url = "http://${local.identity_sc_dns_name}:${local.identity_service_container_grpc_port}"

  # Port that is exposed to the public SSL endpoint (appended to domain name)
  identity_service_grpc_public_port = 50054
  identity_service_domain_name      = "identity.${local.root_domain}"

  opaque_server_setup_secret_name = "identity/ServerSetup"
  staging_allow_origin_list       = <<EOT
    http://localhost:3000,
    http://localhost:3001,
    http://localhost:3002,
    http://localhost:3003,
    http://localhost:3004,
    http://localhost:3005,
    http://localhost:3006,
    http://localhost:3007,
    http://localhost:3008,
    http://localhost:3009
  EOT
  production_allow_origin_list    = "https://web.comm.app"
}

data "aws_secretsmanager_secret" "identity_server_setup" {
  name = local.opaque_server_setup_secret_name
}

resource "aws_ecs_task_definition" "identity_service" {
  family = "identity-service-task-def"
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
          appProtocol   = "grpc"
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
          value = local.tunnelbroker_local_grpc_url
        },
        {
          name  = "BACKUP_SERVICE_URL",
          value = local.backup_local_url
        },
        {
          name  = "BLOB_SERVICE_URL",
          value = local.blob_local_url
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
          # This is exposed as an environment variable in the container
          name      = "OPAQUE_SERVER_SETUP"
          valueFrom = data.aws_secretsmanager_secret.identity_server_setup.arn
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/identity-service-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
      linuxParameters = {
        initProcessEnabled = true
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "bridge"
  cpu                      = "512"
  memory                   = "2048"
  requires_compatibilities = ["EC2"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = false
}

resource "aws_ecs_service" "identity_service" {
  name        = "identity-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "EC2"

  task_definition      = aws_ecs_task_definition.identity_service.arn
  force_new_deployment = true

  desired_count = 2

  # Expose Identity service to other services in the cluster
  service_connect_configuration {
    enabled = true
    service {
      discovery_name = local.identity_sc_dns_name
      port_name      = local.identity_sc_port_name
      client_alias {
        port     = local.identity_service_container_grpc_port
        dns_name = local.identity_sc_dns_name
      }
    }
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.identity_service_ws.arn
    container_name   = local.identity_service_container_name
    container_port   = local.identity_service_container_ws_port
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.identity_service_grpc.arn
    container_name   = local.identity_service_container_name
    container_port   = local.identity_service_container_grpc_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command  = true
  enable_ecs_managed_tags = true
}

# Security group to configure access to the service
resource "aws_security_group" "identity_service" {
  name   = "identity-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.identity_service_container_grpc_port
    to_port     = local.identity_service_container_grpc_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "gRPC port"
  }

  ingress {
    from_port   = local.identity_service_container_ws_port
    to_port     = local.identity_service_container_ws_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Websocket port"
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

resource "aws_lb_target_group" "identity_service_grpc" {
  name             = "identity-service-ecs-grpc-tg"
  port             = local.identity_service_container_grpc_port
  protocol         = "HTTP"
  protocol_version = "HTTP2"
  vpc_id           = aws_vpc.default.id

  # The "bridge" network mode requires target type set to instance
  target_type = "instance"

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 10 # Duration in seconds
    enabled         = true
  }

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "identity_service_ws" {
  name             = "identity-service-ecs-ws-tg"
  port             = local.identity_service_container_ws_port
  protocol         = "HTTP"
  protocol_version = "HTTP1"
  vpc_id           = aws_vpc.default.id
  target_type      = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200"

  }
}

# Load Balancer
resource "aws_lb" "identity_service" {
  load_balancer_type = "application"
  name               = "identity-service-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "identity_service_ws" {
  load_balancer_arn = aws_lb.identity_service.arn
  port              = local.identity_service_container_ws_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.identity_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.identity_service_ws.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.identity_service_ws]
  }
}

resource "aws_lb_listener" "identity_service_grpc" {
  load_balancer_arn = aws_lb.identity_service.arn
  port              = local.identity_service_grpc_public_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.identity_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.identity_service_grpc.arn
  }

  lifecycle {
    # Required only for existing resources to avoid plan difference
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]

    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.identity_service_grpc]
  }
}

# SSL Certificate
data "aws_acm_certificate" "identity_service" {
  domain   = local.identity_service_domain_name
  statuses = ["ISSUED"]
}
