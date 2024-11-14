locals {
  backup_error_patterns = {
    Auth = { name = "Auth", pattern = "Auth Error" },
    Blob = { name = "Blob", pattern = "Blob Error" },
    DDB  = { name = "DDB", pattern = "DDB Error" },
    WS   = { name = "WS", pattern = "WS Error" },
  }
}

resource "aws_sns_topic" "backup_error_topic" {
  name = "backup-error-topic"
}

resource "aws_sns_topic_subscription" "backup_email_subscription" {
  topic_arn = aws_sns_topic.backup_error_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_log_metric_filter" "backup_error_filters" {
  for_each = local.backup_error_patterns

  name           = "Backup${each.value.name}ErrorCount"
  pattern        = "{ $.level = \"ERROR\" && $.fields.errorType = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/backup-service-task-def"

  metric_transformation {
    name      = "Backup${each.value.name}ErrorCount"
    namespace = "BackupServiceMetricFilters"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "backup_error_alarms" {
  for_each = local.backup_error_patterns

  alarm_name          = "Backup${local.is_staging ? "Staging" : "Production"}${each.value.name}ErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Backup${each.value.name}ErrorCount"
  namespace           = "BackupServiceMetricFilters"
  period              = "300"
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alarm when Backup ${each.value.name} errors exceed threshold"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.backup_error_topic.arn]
}

resource "aws_cloudwatch_metric_alarm" "backup_memory_utilization" {
  alarm_name          = "BackupMemoryUtilizationAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Backup service memory utilization exceeds 90%"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.backup_service.name
  }
  alarm_actions = [aws_sns_topic.backup_error_topic.arn]
}

resource "aws_cloudwatch_metric_alarm" "backup_cpu_utilization" {
  alarm_name          = "BackupCPUUtilizationAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Backup service CPU utilization exceeds 90%"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.backup_service.name
  }
  alarm_actions = [aws_sns_topic.backup_error_topic.arn]
}
