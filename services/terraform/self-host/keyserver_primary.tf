locals {
  keyserver_primary_container_name = "keyserver-primary"

  keyserver_run_server_config = jsonencode({
    runKeyserver = true
    runWebApp    = false
    runLanding   = false
  })

  primary_environment_vars = merge(local.shared_environment_vars,
    {
      "COMM_NODE_ROLE"                          = "primary",
      "COMM_JSONCONFIG_facts_run_server_config" = local.keyserver_run_server_config
  })

  primary_environment = [
    for name, value in local.primary_environment_vars : {
      name  = name
      value = value
    }
  ]
}

resource "aws_cloudwatch_log_group" "keyserver_primary_service" {
  name              = "/ecs/keyserver-primary-task-def"
  retention_in_days = 7
}

output "mariadb_address" {
  value = aws_db_instance.mariadb.address
}

resource "aws_ecs_task_definition" "keyserver_primary_service" {
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
      name      = local.keyserver_primary_container_name
      image     = local.keyserver_service_server_image
      essential = true
      portMappings = [
        {
          name          = "keyserver-port"
          containerPort = 3000
          hostPort      = 3000,
          protocol      = "tcp"
        },

      ]
      environment = local.primary_environment
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = aws_cloudwatch_log_group.keyserver_primary_service.name
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
  depends_on = [null_resource.create_comm_database]

  # Do not change name without replacing primary_service_name in aws-deploy.sh
  name                               = "keyserver-primary-service"
  cluster                            = aws_ecs_cluster.keyserver_cluster.id
  task_definition                    = aws_ecs_task_definition.keyserver_primary_service.arn
  launch_type                        = "FARGATE"
  enable_execute_command             = true
  enable_ecs_managed_tags            = true
  force_new_deployment               = true
  desired_count                      = 1
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0


  network_configuration {
    subnets          = local.vpc_subnets
    security_groups  = [aws_security_group.keyserver_service.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.keyserver_service.arn
    container_name   = local.keyserver_primary_container_name
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}
