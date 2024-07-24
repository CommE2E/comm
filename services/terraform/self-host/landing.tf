locals {
  landing_container_name = "landing"

  landing_run_server_config = jsonencode({
    runKeyserver = false
    runWebApp    = false
    runLanding   = true
  })

  landing_environment_vars = merge(local.shared_environment_vars,
    {
      "COMM_NODE_ROLE"                          = "landing",
      "COMM_JSONCONFIG_facts_run_server_config" = local.landing_run_server_config
  })

  landing_environment = [
    for name, value in local.landing_environment_vars : {
      name  = name
      value = value
    }
  ]
}

resource "aws_cloudwatch_log_group" "landing_service" {
  name              = "/ecs/landing-task-def"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "landing_service" {
  network_mode             = "awsvpc"
  family                   = "landing-task-def"
  requires_compatibilities = ["FARGATE"]
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  cpu                      = "2048"
  memory                   = "4096"

  ephemeral_storage {
    size_in_gib = 40
  }

  container_definitions = jsonencode([
    {
      name      = local.landing_container_name
      image     = local.keyserver_service_server_image
      essential = true
      portMappings = [
        {
          name          = "landing-port"
          containerPort = 3000
          hostPort      = 3000,
          protocol      = "tcp"
        },

      ]
      environment = local.landing_environment
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.landing_service.name
          "awslogs-stream-prefix" = "ecs"
          "awslogs-region"        = "${var.region}"
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

  skip_destroy = false
}

resource "aws_ecs_service" "landing_service" {
  depends_on = [null_resource.create_comm_database]

  name                               = "landing-service"
  cluster                            = aws_ecs_cluster.keyserver_cluster.id
  task_definition                    = aws_ecs_task_definition.landing_service.arn
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  enable_ecs_managed_tags            = true
  force_new_deployment               = true
  desired_count                      = 2
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100


  network_configuration {
    subnets          = local.vpc_subnets
    security_groups  = [aws_security_group.keyserver_service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.landing_service.arn
    container_name   = local.landing_container_name
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_lb_target_group" "landing_service" {
  name     = "landing-service-ecs-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = local.vpc_id

  # "awsvpc" network mode requires target type set to ip
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
    matcher  = "200-299"
  }
}

resource "aws_lb" "landing_service" {
  load_balancer_type = "application"
  name               = "landing-service-lb"
  security_groups    = [aws_security_group.landing_lb_sg.id]

  internal = false
  subnets  = local.vpc_subnets
}

resource "aws_lb_listener" "landing_service" {
  load_balancer_arn = aws_lb.landing_service.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.landing_service.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.landing_service.arn
  }

  lifecycle {
    ignore_changes       = [default_action[0].forward[0].stickiness[0].duration]
    replace_triggered_by = [aws_lb_target_group.landing_service]
  }
}

resource "aws_security_group" "landing_lb_sg" {
  name        = "landing-lb-sg"
  description = "Security group for keyserver load balancer"
  vpc_id      = local.vpc_id

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

data "aws_acm_certificate" "landing_service" {
  domain   = var.landing_domain_name
  statuses = ["ISSUED"]
}
