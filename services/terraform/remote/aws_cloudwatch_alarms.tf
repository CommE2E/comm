locals {
  error_reports_subscribed_email = "error-reports@comm.app"

  lambda_error_threshold   = "2"
  identity_error_threshold = "1"

  identity_error_patterns = {
    Search       = { name = "Search", pattern = "Search Error" },
    Sync         = { name = "Sync", pattern = "Sync Error" },
    Database     = { name = "DB", pattern = "*DB Error" },
    GrpcServices = { name = "GrpcServices", pattern = "gRPC Services Error" },
    Siwe         = { name = "Siwe", pattern = "SIWE Error" },
    Tunnelbroker = { name = "Tunnelbroker", pattern = "Tunnelbroker Error" }
    Http         = { name = "HTTP", pattern = "HTTP Error" }
  }

  blob_error_patterns = {
    S3    = { name = "S3", pattern = "S3 Error" },
    DDB   = { name = "DDB", pattern = "DDB Error" },
    HTTP  = { name = "HTTP", pattern = "HTTP Error" },
    Other = { name = "Other", pattern = "Other Error" },
  }

  service_log_groups = {
    Backup         = { name = "Backup", log_group_name = "/ecs/backup-service-task-def" },
    Blob           = { name = "Blob", log_group_name = "/ecs/blob-service-task-def" },
    ElectronUpdate = { name = "ElectronUpdate", log_group_name = "/ecs/electron-update-task-def" },
    FeatureFlags   = { name = "FeatureFlags", log_group_name = "/ecs/feature-flags-task-def" },
    Identity       = { name = "Identity", log_group_name = "/ecs/identity-service-task-def" },
    Reports        = { name = "Reports", log_group_name = "/ecs/reports-service-task-def" },
    Tunnelbroker   = { name = "Tunnelbroker", log_group_name = "/ecs/tunnelbroker-task-def" }
  }
}

resource "aws_sns_topic" "lambda_alarm_topic" {
  name = "lambda-error-alarm-topic"
}

resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.lambda_alarm_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  alarm_name          = "SearchIndexLambdaErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "LambdaErrors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = local.lambda_error_threshold
  alarm_description   = "Alarm tracking search index lambda function failure"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.lambda_alarm_topic.arn]
  dimensions = {
    FunctionName = module.shared.search_index_lambda.function_name
  }
}

resource "aws_sns_topic" "identity_error_topic" {
  name = "identity-error-topic"
}

resource "aws_sns_topic_subscription" "identity_email_subscription" {
  topic_arn = aws_sns_topic.identity_error_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_sns_topic_subscription" "ecs_task_stop_subscription" {
  topic_arn = aws_sns_topic.ecs_task_stop_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_log_metric_filter" "identity_error_filters" {
  for_each = local.identity_error_patterns

  name           = "Identity${each.value.name}ErrorCount"
  pattern        = "{ $.level = \"ERROR\" && $.fields.errorType = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/identity-service-task-def"

  metric_transformation {
    name      = "Identity${each.value.name}ErrorCount"
    namespace = "IdentityServiceMetricFilters"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "identity_error_alarms" {
  for_each = local.identity_error_patterns

  alarm_name          = "Identity${local.is_staging ? "Staging" : "Production"}${each.value.name}ErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Identity${each.value.name}ErrorCount"
  namespace           = "IdentityServiceMetricFilters"
  period              = "300"
  statistic           = "Sum"
  threshold           = local.identity_error_threshold
  alarm_description   = "Alarm when Identity ${each.value.name} errors exceed threshold"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.identity_error_topic.arn]
}

resource "aws_sns_topic" "ecs_task_stop_topic" {
  name = "ecs-task-stop-topic"
}

resource "aws_cloudwatch_event_rule" "ecs_task_stop" {
  name        = "ecs-task-stop-rule"
  description = "Filters for ecs task stop events"

  event_pattern = jsonencode({
    source = ["aws.ecs"],
    detail = {
      lastStatus = ["STOPPED"],
      clusterArn = [aws_ecs_cluster.comm_services.arn],
      containers = {
        exitCode = [
          {
            anything-but = 0
          }
        ]
      }
    }
  })
}

resource "aws_cloudwatch_log_group" "ecs_task_stop" {
  name              = "/aws/events/ecs_task_stop"
  retention_in_days = 1
}

resource "aws_cloudwatch_event_target" "ecs_task_stop" {

  rule = aws_cloudwatch_event_rule.ecs_task_stop.name
  arn  = aws_cloudwatch_log_group.ecs_task_stop.arn
}

resource "aws_cloudwatch_log_metric_filter" "ecs_task_stop" {
  name           = "ECSTaskStopCount"
  log_group_name = aws_cloudwatch_log_group.ecs_task_stop.name
  pattern        = "{ $.detail.stopCode = \"EssentialContainerExited\" }"

  metric_transformation {
    name          = "ECSTaskStopCount"
    namespace     = "ECSMetrics"
    value         = "1"
    default_value = 0
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_task_stop" {
  alarm_name          = "ECS${local.is_staging ? "Staging" : "Production"}TaskStopAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "ECSTaskStopCount"
  namespace           = "ECSMetrics"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "This metric monitors ECS tasks stops"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.ecs_task_stop_topic.arn]
}

resource "aws_sns_topic" "service_connection_error_topic" {
  name = "service-connection-error-topic"
}

resource "aws_sns_topic_subscription" "service_connection_error_email_subscription" {
  topic_arn = aws_sns_topic.service_connection_error_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_log_metric_filter" "service_connection_error_filters" {
  for_each = local.service_log_groups

  name           = "${each.value.name}ConnectionErrorCount"
  pattern        = "dns error"
  log_group_name = each.value.log_group_name

  metric_transformation {
    name      = "${each.value.name}ConnectionErrorCount"
    namespace = "ServiceConnectionMetricFilters"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "service_connection_error_alarms" {
  for_each = local.service_log_groups

  alarm_name          = "${each.value.name}ConnectionErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "${each.value.name}ConnectionErrorCount"
  namespace           = "ServiceConnectionMetricFilters"
  period              = "300"
  statistic           = "Sum"
  threshold           = "1"
  alarm_description   = "Alarm when ${each.value.name} connection errors exceed threshold"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.service_connection_error_topic.arn]
}


resource "aws_sns_topic" "blob_error_topic" {
  name = "blob-error-topic"
}

resource "aws_sns_topic_subscription" "blob_email_subscription" {
  topic_arn = aws_sns_topic.blob_error_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_log_metric_filter" "blob_error_filters" {
  for_each = local.blob_error_patterns

  name           = "Blob${each.value.name}ErrorCount"
  pattern        = "{ $.level = \"ERROR\" && $.fields.errorType = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/blob-service-task-def"

  metric_transformation {
    name      = "Blob${each.value.name}ErrorCount"
    namespace = "BlobServiceMetricFilters"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "blob_error_alarms" {
  for_each = local.blob_error_patterns

  alarm_name          = "Blob${local.is_staging ? "Staging" : "Production"}${each.value.name}ErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Blob${each.value.name}ErrorCount"
  namespace           = "BlobServiceMetricFilters"
  period              = "300"
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alarm when Blob ${each.value.name} errors exceed threshold"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.blob_error_topic.arn]
}

resource "aws_cloudwatch_metric_alarm" "blob_memory_utilization" {
  alarm_name          = "ecs-memory-utilization-90"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Blob service memory utilization exceeds 90%"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.blob_service.name
  }
  alarm_actions = [aws_sns_topic.blob_error_topic.arn]
}


resource "aws_cloudwatch_metric_alarm" "blob_cpu_utilization" {
  alarm_name          = "ecs-cpu-utilization-90"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Blob service CPU utilization exceeds 90%"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.blob_service.name
  }
  alarm_actions = [aws_sns_topic.blob_error_topic.arn]
}
