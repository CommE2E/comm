locals {
  identity_error_patterns = {
    Search       = { name = "Search", pattern = "Search Error" },
    Sync         = { name = "Sync", pattern = "Sync Error" },
    Database     = { name = "DB", pattern = "*DB Error" },
    GrpcServices = { name = "GrpcServices", pattern = "gRPC Services Error" },
    Siwe         = { name = "Siwe", pattern = "SIWE Error" },
    Tunnelbroker = { name = "Tunnelbroker", pattern = "Tunnelbroker Error" }
    Http         = { name = "HTTP", pattern = "HTTP Error" }
  }

  identity_error_threshold = 1
}

resource "aws_sns_topic" "identity_error_topic" {
  name = "identity-error-topic"
}

resource "aws_sns_topic_subscription" "identity_email_subscription" {
  topic_arn = aws_sns_topic.identity_error_topic.arn
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

