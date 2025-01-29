locals {
  tunnelbroker_config = {
    docker_image = "commapp/tunnelbroker"
    docker_tag   = local.is_staging ? "0.18.3" : "0.18.2"

    grpc_port      = 50051
    websocket_port = 51001
    container_name = "tunnelbroker-server"
    domain_name    = "tunnelbroker.${local.root_domain}"

    local_dns_name = "tunnelbroker"
    grpc_port_name = "tunnelbroker_grpc"
  }

  # Used for other services to connect to Tunnelbroker gRPC endpoint
  tunnelbroker_local_grpc_url = "http://${local.tunnelbroker_config.local_dns_name}:${local.tunnelbroker_config.grpc_port}"

  # utility locals
  tunnelbroker_docker_image = "${local.tunnelbroker_config.docker_image}:${local.tunnelbroker_config.docker_tag}"
  rabbitmq_password         = local.secrets.amqpPassword[local.environment]

  apns_config_secret_name     = "tunnelbroker/APNsConfig"
  fcm_config_secret_name      = "tunnelbroker/FCMConfig"
  web_push_config_secret_name = "tunnelbroker/WebPushConfig"
  wns_config_secret_name      = "tunnelbroker/WNSConfig"
}

data "aws_secretsmanager_secret" "tunnelbroker_apns" {
  name = local.apns_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_fcm" {
  name = local.fcm_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_web_push" {
  name = local.web_push_config_secret_name
}

data "aws_secretsmanager_secret" "tunnelbroker_wns" {
  name = local.wns_config_secret_name
}

# RabbitMQ
resource "aws_mq_broker" "tunnelbroker_rabbitmq" {
  broker_name = "tunnelbroker-rabbitmq"

  # Keep RabbitMQ version in sync with docker-compose.yml
  engine_type        = "RabbitMQ"
  engine_version     = "3.11.16"
  host_instance_type = local.is_staging ? "mq.t3.micro" : "mq.m5.large"
  apply_immediately  = local.is_staging
  deployment_mode    = "SINGLE_INSTANCE"
  # Access from outside VPC - this allows to access the RabbitMQ console from browser
  publicly_accessible = true

  user {
    username = "comm"
    password = local.rabbitmq_password
  }
}
locals {
  amqp_endpoint = aws_mq_broker.tunnelbroker_rabbitmq.instances[0].endpoints[0]
}

# Task definition - defines container resources, ports,
# environment variables, docker image etc.
resource "aws_ecs_task_definition" "tunnelbroker" {
  family = "tunnelbroker-task-def"
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
          value = local.identity_local_url
        },
        {
          name  = "COMM_SERVICES_USE_JSON_LOGS",
          value = local.comm_services_use_json_logs
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
          "awslogs-group"         = "/ecs/tunnelbroker-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "bridge"
  cpu                      = "256"
  memory                   = "256"
  requires_compatibilities = ["EC2"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = true
}

# ECS Service - defines task scaling, load balancer connection,
# network configuration etc.
resource "aws_ecs_service" "tunnelbroker" {
  name        = "tunnelbroker"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "EC2"

  task_definition      = aws_ecs_task_definition.tunnelbroker.arn
  force_new_deployment = true

  desired_count = 2

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = local.tunnelbroker_config.local_dns_name
      port_name      = local.tunnelbroker_config.grpc_port_name
      client_alias {
        port     = local.tunnelbroker_config.grpc_port
        dns_name = local.tunnelbroker_config.local_dns_name
      }
    }
  }

  # Websocket
  load_balancer {
    target_group_arn = aws_lb_target_group.tunnelbroker_ws.arn
    container_name   = local.tunnelbroker_config.container_name
    container_port   = local.tunnelbroker_config.websocket_port
  }

  # gRPC
  dynamic "load_balancer" {
    for_each = aws_lb_listener.tunnelbroker_grpc
    content {
      target_group_arn = aws_lb_target_group.tunnelbroker_grpc.arn
      container_name   = local.tunnelbroker_config.container_name
      container_port   = local.tunnelbroker_config.grpc_port
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

# Security group to configure access to the service
resource "aws_security_group" "tunnelbroker" {
  name   = "tunnelbroker-sg"
  vpc_id = aws_vpc.default.id

  # Websocket
  ingress {
    from_port   = local.tunnelbroker_config.websocket_port
    to_port     = local.tunnelbroker_config.websocket_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Websocket port"
  }

  # gRPC
  ingress {
    from_port   = local.tunnelbroker_config.grpc_port
    to_port     = local.tunnelbroker_config.grpc_port
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

# Running service instances are registered here
# to be accessed by the load balancer
resource "aws_lb_target_group" "tunnelbroker_ws" {
  name             = "tunnelbroker-ws-tg"
  port             = local.tunnelbroker_config.websocket_port
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

/* This is generally a dead (empty) resource on prod, i.e. it should not have
 * any targets registered. We have gRPC listener resource disabled on prod,
 * which results in the following exception if any targets are registered here:
 *   "The target group "tunnelbroker-grpc-tg" does not have
 *    an associated load balancer."
 *
 * See also `aws_lb_listener.tunnelbroker_grpc` and the "dynamic" block in
 * `aws_ecs_service.tunnelbroker` on how this is disabled.
 * The `count` or `for_each` isn't added here to avoid complicating things more.
 */
resource "aws_lb_target_group" "tunnelbroker_grpc" {
  name             = "tunnelbroker-grpc-tg"
  port             = local.tunnelbroker_config.grpc_port
  protocol         = "HTTP"
  protocol_version = "GRPC"
  vpc_id           = aws_vpc.default.id
  target_type      = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Load Balancer
resource "aws_lb" "tunnelbroker" {
  load_balancer_type = "application"
  name               = "tunnelbroker-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "tunnelbroker_ws" {
  load_balancer_arn = aws_lb.tunnelbroker.arn
  port              = local.tunnelbroker_config.websocket_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.tunnelbroker.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tunnelbroker_ws.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.tunnelbroker_ws]
  }
}

resource "aws_lb_listener" "tunnelbroker_grpc" {
  count             = local.is_staging ? 1 : 0
  load_balancer_arn = aws_lb.tunnelbroker.arn
  port              = local.tunnelbroker_config.grpc_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.tunnelbroker.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tunnelbroker_grpc.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.tunnelbroker_grpc]
  }
}

# SSL Certificate
data "aws_acm_certificate" "tunnelbroker" {
  domain   = local.tunnelbroker_config.domain_name
  statuses = ["ISSUED"]
}

output "rabbitmq_console_url" {
  value = aws_mq_broker.tunnelbroker_rabbitmq.instances[0].console_url
}
