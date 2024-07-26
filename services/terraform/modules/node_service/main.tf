locals {
  environment_var_list = [
    for name, value in var.environment_vars : {
      name  = name
      value = value
    }
  ]
}

resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.service_name}-task-def"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "service" {
  network_mode             = "awsvpc"
  family                   = "${var.service_name}-task-def"
  requires_compatibilities = ["FARGATE"]
  task_role_arn            = var.ecs_task_role_arn
  execution_role_arn       = var.ecs_task_execution_role_arn
  cpu                      = var.cpu
  memory                   = var.memory

  ephemeral_storage {
    size_in_gib = var.ephemeral_storage
  }

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.image
      essential = true
      portMappings = [
        {
          name          = "${var.service_name}-port"
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        },
      ]
      environment = local.environment_var_list
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-stream-prefix" = "ecs"
          "awslogs-region"        = var.region
        }
      }
      linuxParameters = {
        initProcessEnabled = true
      }
    }
  ])

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }
}

resource "aws_security_group" "service" {
  name   = "${var.service_name}-service-ecs-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description      = "Allow inbound traffic from any IPv6 address"
    from_port        = 3000
    to_port          = 3000
    protocol         = "tcp"
    ipv6_cidr_blocks = ["::/0"]
  }

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

resource "aws_ecs_service" "service" {
  name                               = var.service_name
  cluster                            = var.cluster_id
  task_definition                    = aws_ecs_task_definition.service.arn
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  enable_ecs_managed_tags            = true
  force_new_deployment               = true
  desired_count                      = var.desired_count
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  network_configuration {
    subnets          = var.vpc_subnets
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service.arn
    container_name   = var.container_name
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_lb_target_group" "service" {
  name     = "${var.service_name}-ecs-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  target_type = "ip"

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86500
    enabled         = true
  }

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3

    protocol = "HTTP"
    path     = "/health"
    matcher  = "200"
  }
}

resource "aws_lb" "service" {
  load_balancer_type = "application"
  name               = "${var.service_name}-lb"
  security_groups    = [aws_security_group.lb_sg.id]

  internal = false
  subnets  = var.vpc_subnets
}

resource "aws_lb_listener" "service" {
  load_balancer_arn = aws_lb.service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.service]
  }
}

resource "aws_security_group" "lb_sg" {
  name        = "${var.service_name}-lb-sg"
  description = "Security group for ${var.service_name} load balancer"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_acm_certificate" "service" {
  domain   = var.domain_name
  statuses = ["ISSUED"]
}
