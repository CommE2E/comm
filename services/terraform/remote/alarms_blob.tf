locals {
  blob_error_patterns = {
    S3    = { name = "S3", pattern = "S3 Error" },
    DDB   = { name = "DDB", pattern = "DDB Error" },
    HTTP  = { name = "HTTP", pattern = "HTTP Error" },
    Other = { name = "Other", pattern = "Other Error" },
  }
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
  alarm_name          = "BlobMemoryUtilizationAlarm"
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
  alarm_name          = "BlobCPUUtilizationAlarm"
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
