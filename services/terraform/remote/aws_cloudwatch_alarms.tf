locals {
  error_reports_subscribed_email = "error-reports@comm.app"

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

resource "aws_sns_topic_subscription" "ecs_task_stop_subscription" {
  topic_arn = aws_sns_topic.ecs_task_stop_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
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
