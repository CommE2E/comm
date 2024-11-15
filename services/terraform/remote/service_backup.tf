locals {
  backup_service_image_tag      = local.is_staging ? "0.5.1" : "0.5.0"
  backup_service_container_name = "backup-service-server"
  backup_service_server_image   = "commapp/backup-server:${local.backup_service_image_tag}"
  backup_service_domain_name    = "backup.${local.root_domain}"

  # HTTP port & configuration for ECS Service Connect
  backup_service_container_http_port = 50052
  backup_sc_port_name                = "backup-service-ecs-http"
  backup_sc_dns_name                 = "backup-service"

  # URL accessible by other services in the same Service Connect namespace
  # This renders to 'http://backup-service:50052'
  backup_local_url = "http://${local.backup_sc_dns_name}:${local.backup_service_container_http_port}"
}

resource "aws_ecs_task_definition" "backup_service" {
  family = "backup-service-task-def"
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
          value = local.blob_local_url
          # If this ever fails, we can fallback to blob public URL:
          # "https://${local.blob_service_domain_name}"
        },
        {
          name  = "IDENTITY_SERVICE_ENDPOINT",
          value = local.identity_local_url
        },
        {
          name  = "COMM_SERVICES_DISABLE_CSAT_VERIFICATION",
          value = local.is_staging ? "false" : "true"
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
          "awslogs-group"         = "/ecs/backup-service-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.backup_service.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "bridge"
  cpu                      = "256"
  memory                   = "256"
  requires_compatibilities = ["EC2"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = false
}

resource "aws_ecs_service" "backup_service" {
  name        = "backup-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "EC2"

  task_definition      = aws_ecs_task_definition.backup_service.arn
  force_new_deployment = true

  desired_count = 1
  lifecycle {
    ignore_changes = [desired_count]
  }

  service_connect_configuration {
    enabled = true
    service {
      discovery_name = local.backup_sc_dns_name
      port_name      = local.backup_sc_port_name
      client_alias {
        port     = local.backup_service_container_http_port
        dns_name = local.backup_sc_dns_name
      }
    }
  }

  # HTTP
  load_balancer {
    target_group_arn = aws_lb_target_group.backup_service_http.arn
    container_name   = local.backup_service_container_name
    container_port   = local.backup_service_container_http_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  enable_execute_command  = true
  enable_ecs_managed_tags = true
}

# Security group to configure access to the service
resource "aws_security_group" "backup_service" {
  name   = "backup-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.backup_service_container_http_port
    to_port     = local.backup_service_container_http_port
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

resource "aws_lb_target_group" "backup_service_http" {
  name     = "backup-service-ecs-http-tg"
  port     = local.backup_service_container_http_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.default.id

  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200-204"
  }
}

# Load Balancer
resource "aws_lb" "backup_service" {
  load_balancer_type = "application"
  name               = "backup-service-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "backup_service_https" {
  load_balancer_arn = aws_lb.backup_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.backup_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backup_service_http.arn
  }

  lifecycle {
    # Target group cannot be destroyed if it is used
    replace_triggered_by = [aws_lb_target_group.backup_service_http]

    # Required to avoid no-op plan differences
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]
  }
}

# SSL Certificate
data "aws_acm_certificate" "backup_service" {
  domain   = local.backup_service_domain_name
  statuses = ["ISSUED"]
}
