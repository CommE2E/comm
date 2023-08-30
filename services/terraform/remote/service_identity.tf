locals {
  identity_service_image_tag      = "0.3"
  identity_service_server_image   = "commapp/identity-server:${local.identity_service_image_tag}"
  identity_service_container_name = "identity-server"

  # Port that the container is listening on
  identity_service_container_grpc_port = 50054
  identity_sc_port_name                = "identity-service-ecs-grpc"
  identity_sc_dns_name                 = "identity-service"

  # Endpoint name accessible by other services in the same Service Connect namespace
  # This renders to e.g. 'identity-service:50054'
  identity_local_endpoint = "${local.identity_sc_dns_name}:${local.identity_service_container_grpc_port}"

  # Port that is exposed to the public SSL endpoint (appended to domain name)
  identity_service_grpc_public_port = 50054
  identity_service_domain_name      = "identity.${local.root_domain}"

  opaque_server_setup_secret_name = "identity/ServerSetup"
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
        }
      ]
      environment = [
        {
          name  = "RUST_LOG"
          value = "info"
        },
        {
          name  = "KEYSERVER_PUBLIC_KEY"
          value = nonsensitive(local.secrets["keyserverPublicKey"])
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
  memory                   = "512"
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

  desired_count = 1
  lifecycle {
    ignore_changes = [desired_count]
  }

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
  protocol_version = "GRPC"
  vpc_id           = aws_vpc.default.id

  # The "bridge" network mode requires target type set to instance
  target_type = "instance"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
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

resource "aws_lb_listener" "identity_service_grpc" {
  load_balancer_arn = aws_lb.identity_service.arn
  port              = local.identity_service_grpc_public_port
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.identity_service.arn

  default_action {
    type = "forward"
    forward {
      # ECS target group
      target_group {
        arn    = aws_lb_target_group.identity_service_grpc.arn
        weight = 1
      }
      # Legacy EC2 Target
      dynamic "target_group" {
        for_each = data.aws_lb_target_group.identity_service_legacy_ec2
        content {
          arn    = target_group.value["arn"]
          weight = 0
        }
      }
    }
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

# Legacy EC2 instance target
data "aws_lb_target_group" "identity_service_legacy_ec2" {
  # We don't have legacy EC2 services in staging
  count = local.is_staging ? 0 : 1
  name  = "identity-service-tg"
}

# Required for Route53 DNS record
output "identity_service_load_balancer_dns_name" {
  value = aws_lb.identity_service.dns_name
}
