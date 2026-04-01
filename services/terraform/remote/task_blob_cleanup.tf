locals {
  # Run every day at midnight UTC
  blob_cleanup_enabled  = true
  blob_cleanup_schedule = "cron(0 0 * * ? *)"
}

resource "aws_cloudwatch_log_group" "blob_cleanup" {
  count = local.service_enabled.blob ? 1 : 0

  name              = "/ecs/blob-cleanup"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "blob_cleanup" {
  count = local.service_enabled.blob ? 1 : 0

  family = "blob-cleanup-task-def"
  container_definitions = jsonencode([
    {
      essential = true
      name      = local.blob_service_container_name
      image     = local.blob_service_server_image
      command   = ["blob", "cleanup"]
      environment = [
        {
          name  = "RUST_LOG"
          value = local.is_staging ? "info,blob=trace,comm_lib=debug" : "info"
        },
        {
          name  = "BLOB_S3_BUCKET_NAME",
          value = local.blob_service_s3_bucket
        },
        {
          name  = "COMM_SERVICES_USE_JSON_LOGS",
          value = local.comm_services_use_json_logs
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-group"         = aws_cloudwatch_log_group.blob_cleanup[0].name
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

resource "aws_scheduler_schedule" "blob_cleanup" {
  count = local.service_enabled.blob ? 1 : 0

  name       = "blob-cleanup-schedule"
  group_name = "default"

  schedule_expression = local.blob_cleanup_schedule
  state               = local.blob_cleanup_enabled ? "ENABLED" : "DISABLED"

  # Task can run within 15 minutes window of the scheduled time
  flexible_time_window {
    mode                      = "FLEXIBLE"
    maximum_window_in_minutes = 15
  }

  target {
    arn      = aws_ecs_cluster.comm_services.arn
    role_arn = aws_iam_role.task_scheduler.arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.blob_cleanup[0].arn_without_revision
      launch_type         = "FARGATE"

      network_configuration {
        assign_public_ip = true
        security_groups  = [aws_security_group.blob_service[0].id]
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

resource "aws_iam_role_policy_attachment" "blob_cleanup_scheduler" {
  count = local.service_enabled.blob ? 1 : 0

  policy_arn = aws_iam_policy.blob_cleanup_scheduler[0].arn
  role       = aws_iam_role.task_scheduler.name
}

resource "aws_iam_policy" "blob_cleanup_scheduler" {
  count = local.service_enabled.blob ? 1 : 0

  name = "blob-cleanup-cron-scheduler-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow scheduler to execute the task
      {

        Effect = "Allow",
        Action = [
          "ecs:RunTask"
        ]
        Resource = aws_ecs_task_definition.blob_cleanup[0].arn_without_revision
      },
      # Allow scheduler to set the IAM roles of the ECS task
      {
        Effect = "Allow",
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_ecs_task_definition.blob_cleanup[0].execution_role_arn,
          aws_ecs_task_definition.blob_cleanup[0].task_role_arn
        ]
      },
    ]
  })
}
