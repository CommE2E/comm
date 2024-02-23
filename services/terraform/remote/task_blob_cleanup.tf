locals {
  # Run every day at midnight UTC
  blob_cleanup_enabled  = true
  blob_cleanup_schedule = "cron(0 0 * * ? *)"
}

resource "aws_ecs_task_definition" "blob_cleanup" {
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
        }
      ]
      logConfiguration = {
        "logDriver" = "awslogs"
        "options" = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/blob-cleanup"
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
    role_arn = aws_iam_role.scheduler.arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.blob_cleanup.arn_without_revision
      launch_type         = "FARGATE"

      network_configuration {
        assign_public_ip = true
        security_groups  = [aws_security_group.blob_service.id]
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
