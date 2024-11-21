locals {
  reports_service_image_tag           = local.is_staging ? "0.1.3" : "0.1.3"
  reports_service_container_name      = "reports-service-server"
  reports_service_server_image        = "commapp/reports-server:${local.reports_service_image_tag}"
  reports_service_container_http_port = 50056
  reports_service_domain_name         = "reports.${local.root_domain}"
}

resource "aws_secretsmanager_secret" "email_config" {
  name_prefix = "email_config"
  description = "E-mail configuration for the reports service"
}
resource "aws_secretsmanager_secret_version" "email_config" {
  secret_id     = aws_secretsmanager_secret.email_config.id
  secret_string = jsonencode(local.secrets["emailConfig"])
}

resource "aws_ecs_task_definition" "reports_service" {
  family = "reports-service-task-def"
  container_definitions = jsonencode([
    {
      name      = local.reports_service_container_name
      image     = local.reports_service_server_image
      essential = true
      portMappings = [
        {
          containerPort = local.reports_service_container_http_port
          protocol      = "tcp"
          appProtocol   = "http"
        },
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,reports=debug,comm_lib=debug" : "info"
        },
        {
          name  = "MAX_REPORT_SIZE"
          value = "314572800" # 300MB
        },
        {
          name  = "PUBLIC_URL",
          value = "https://${local.reports_service_domain_name}"
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
        }
      ]
      # Don't enable e-mails on staging.
      secrets = local.is_staging ? [] : [
        {
          # This is exposed as an environment variable in the container
          name      = "EMAIL_CONFIG"
          valueFrom = aws_secretsmanager_secret.email_config.arn
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/reports-service-task-def"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.reports_service.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "8192"
  requires_compatibilities = ["EC2", "FARGATE"]

  # Set this to true if you want to keep old revisions
  # when this definition is changed
  skip_destroy = false
}

resource "aws_ecs_service" "reports_service" {
  name        = "reports-service"
  cluster     = aws_ecs_cluster.comm_services.id
  launch_type = "FARGATE"

  task_definition      = aws_ecs_task_definition.reports_service.arn
  force_new_deployment = true

  desired_count = 1
  lifecycle {
    ignore_changes = [desired_count]
  }

  service_connect_configuration {
    # to be able to reach Blob service by DNS name
    enabled = true
  }

  # HTTP
  load_balancer {
    target_group_arn = aws_lb_target_group.reports_service_http.arn
    container_name   = local.reports_service_container_name
    container_port   = local.reports_service_container_http_port
  }

  network_configuration {
    assign_public_ip = true
    security_groups = [
      aws_security_group.reports_service.id,
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

  enable_execute_command  = true
  enable_ecs_managed_tags = true
}

# Security group to configure access to the service
resource "aws_security_group" "reports_service" {
  name   = "reports-service-ecs-sg"
  vpc_id = aws_vpc.default.id

  ingress {
    from_port   = local.reports_service_container_http_port
    to_port     = local.reports_service_container_http_port
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

resource "aws_lb_target_group" "reports_service_http" {
  name     = "reports-service-ecs-http-tg"
  port     = local.reports_service_container_http_port
  protocol = "HTTP"
  vpc_id   = aws_vpc.default.id

  # ECS Fargate requires target type set to IP
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

# Load Balancer
resource "aws_lb" "reports_service" {
  load_balancer_type = "application"
  name               = "reports-service-lb"
  internal           = false
  subnets = [
    aws_subnet.public_a.id,
    aws_subnet.public_b.id,
    aws_subnet.public_c.id,
  ]
}

resource "aws_lb_listener" "reports_service_https" {
  load_balancer_arn = aws_lb.reports_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.reports_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.reports_service_http.arn
  }

  lifecycle {
    # Required to avoid no-op plan differences
    ignore_changes = [default_action[0].forward[0].stickiness[0].duration]
  }
}

# SSL Certificate
data "aws_acm_certificate" "reports_service" {
  domain   = local.reports_service_domain_name
  statuses = ["ISSUED"]
}
