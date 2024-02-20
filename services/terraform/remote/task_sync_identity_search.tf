locals {
  # Run every day at midnight UTC
  sync_identity_search_enabled  = true
  sync_identity_search_schedule = "cron(0 0 * * ? *)"
}

resource "aws_ecs_task_definition" "sync_identity_search" {
  family = "sync-identity-search-task-def"
  container_definitions = jsonencode([
    {
      essential = true
      name      = local.identity_service_container_name
      image     = local.identity_service_server_image
      command   = ["identity", "sync-identity-search"]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,identity=trace,comm_lib=debug" : "info"
        },
        {
          name  = "OPENSEARCH_ENDPOINT"
          value = "${module.shared.opensearch_domain_identity.endpoint}"
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
          "awslogs-group"         = "/ecs/sync-identity-search"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  task_role_arn            = aws_iam_role.services_ddb_full_access.arn
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  requires_compatibilities = ["FARGATE"]
  skip_destroy             = false
}

resource "aws_scheduler_schedule" "sync_identity_search" {
  name       = "sync-identity-search-schedule"
  group_name = "default"

  schedule_expression = local.sync_identity_search_schedule
  state               = local.sync_identity_search_enabled ? "ENABLED" : "DISABLED"

  # Task can run within 15 minutes window of the scheduled time
  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 15
  }

  target {
    arn      = aws_ecs_cluster.comm_services.arn
    role_arn = aws_iam_role.scheduler.arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.sync_identity_search.arn_without_revision
      launch_type         = "FARGATE"

      network_configuration {
        assign_public_ip = true
        security_groups  = [aws_security_group.identity_service.id]
        subnets = [
          aws_subnet.public_a.id,
          aws_subnet.public_b.id,
          aws_subnet.public_c.id,
        ]
      }
    }

    retry_policy {
      maximum_event_age_in_seconds = 300
      maximum_retry_attempts       = 5
    }
  }
}

resource "aws_iam_role_policy_attachment" "sync_identity_search_scheduler" {
  policy_arn = aws_iam_policy.sync_identity_search_scheduler.arn
  role       = aws_iam_role.scheduler.name
}

resource "aws_iam_policy" "sync_identity_search_scheduler" {
  name = "cron-sync-identity-search-scheduler-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow scheduler to execute the task
      {

        Effect = "Allow",
        Action = [
          "ecs:RunTask"
        ]
        Resource = aws_ecs_task_definition.sync_identity_search.arn_without_revision
      },
      # Allow scheduler to set the IAM roles of the ECS task
      {
        Effect = "Allow",
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_ecs_task_definition.sync_identity_search.execution_role_arn,
          aws_ecs_task_definition.sync_identity_search.task_role_arn
        ]
      },
    ]
  })
}
