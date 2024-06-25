locals {
  keyserver_service_image_tag      = "1.0"
  keyserver_service_server_image   = "wyilio/keyserver:${local.keyserver_service_image_tag}"
  keyserver_service_container_name = "keyserver-primary"
}

resource "aws_cloudwatch_log_group" "ecs_log_group" {
  name              = "/ecs/keyserver-primary-task-def"
  retention_in_days = 7
}

output "mariadb_address" {
  value = aws_db_instance.mariadb.address
}

resource "aws_ecs_task_definition" "keyserver_service" {
  network_mode             = "awsvpc"
  family                   = "keyserver-primary-task-def"
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
      name      = local.keyserver_service_container_name
      image     = local.keyserver_service_server_image
      essential = true
      portMappings = [
        {
          name          = "keyserver-port"
          containerPort = 3000
          protocol      = "tcp"
        },
        {
          name          = "http-port"
          containerPort = 80
          protocol      = "tcp"
          appProtocol   = "http"
        },
      ]
      environment = [
        {
          name  = "COMM_DATABASE_HOST"
          value = "${aws_db_instance.mariadb.address}"
        },
        {
          name  = "COMM_DATABASE_DATABASE"
          value = "comm"
        },
        {
          name  = "COMM_DATABASE_PORT"
          value = "3307"
        },
        {
          name  = "COMM_DATABASE_USER"
          value = "${var.mariadb_username}"
        },
        {
          name  = "COMM_DATABASE_PASSWORD"
          value = "${var.mariadb_password}"
        },
        {
          name = "COMM_JSONCONFIG_secrets_user_credentials"
          value = jsonencode({
            "username" : "${var.keyserver_username}",
            "password" : "${var.keyserver_password}",
            "usingIdentityCredentials" : "${var.using_identity_credentials}"
          })
        },
        {
          name = "COMM_JSONCONFIG_facts_webapp_cors"
          value = jsonencode({
            "domain" : "https://web.comm.app"
          })
        },
        {
          name = "COMM_JSONCONFIG_secrets_identity_service_config",
          value = jsonencode({
            "identitySocketAddr" : "${var.identity_socket_address}"
          })
        },
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.ecs_log_group.name
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

resource "aws_ecs_service" "keyserver_primary_service" {
  name                    = "keyserver-primary-service"
  cluster                 = aws_ecs_cluster.keyserver_cluster.id
  task_definition         = aws_ecs_task_definition.keyserver_service.arn
  launch_type             = "FARGATE"
  enable_execute_command  = true
  enable_ecs_managed_tags = true
  force_new_deployment    = true
  desired_count           = 1

  network_configuration {
    subnets          = [data.aws_subnets.default.ids[0], data.aws_subnets.default.ids[1]]
    security_groups  = [aws_security_group.keyserver_service.id]
    assign_public_ip = true
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

resource "aws_security_group" "keyserver_service" {
  name   = "keyserver-service-ecs-sg"
  vpc_id = data.aws_vpc.default.id

  # Allow all inbound traffic. This is temporary until load balancer is configured
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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


