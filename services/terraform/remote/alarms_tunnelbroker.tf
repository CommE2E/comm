locals {
  tunnelbroker_error_patterns = {
    AMQP      = { name = "AMQP", pattern = "AMQP Error" },
    DDB       = { name = "DDB", pattern = "DDB Error" },
    FCM       = { name = "FCM", pattern = "FCM Error" },
    APNs      = { name = "APNs", pattern = "APNs Error" },
    WebPush   = { name = "WebPush", pattern = "Web Push Error" },
    WNS       = { name = "WNS", pattern = "WNS Error" },
    Identity  = { name = "Identity", pattern = "Identity Error" },
    Websocket = { name = "Websocket", pattern = "Websocket Error" },
    Server    = { name = "Server", pattern = "Server Error" },
  }
}

resource "aws_sns_topic" "tunnelbroker_error_topic" {
  name = "tunnelbroker-error-topic"
}

resource "aws_sns_topic_subscription" "tunnelbroker_email_subscription" {
  topic_arn = aws_sns_topic.tunnelbroker_error_topic.arn
  protocol  = "email"
  endpoint  = local.error_reports_subscribed_email
}

resource "aws_cloudwatch_log_metric_filter" "tunnelbroker_error_filters" {
  for_each = local.tunnelbroker_error_patterns

  name           = "Tunnelbroker${each.value.name}ErrorCount"
  pattern        = "{ $.level = \"ERROR\" && $.fields.errorType = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/tunnelbroker-task-def"

  metric_transformation {
    name      = "Tunnelbroker${each.value.name}ErrorCount"
    namespace = "TunnelbrokerServiceMetricFilters"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "tunnelbroker_error_alarms" {
  for_each = local.tunnelbroker_error_patterns

  alarm_name          = "Tunnelbroker${local.is_staging ? "Staging" : "Production"}${each.value.name}ErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "1"
  metric_name         = "Tunnelbroker${each.value.name}ErrorCount"
  namespace           = "TunnelbrokerServiceMetricFilters"
  period              = "300"
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Alarm when Tunnelbroker ${each.value.name} errors exceed threshold"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.tunnelbroker_error_topic.arn]
}

resource "aws_cloudwatch_metric_alarm" "tunnelbroker_memory_utilization" {
  alarm_name          = "TunnelbrokerMemoryUtilizationAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "MemoryUtilization"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Tunnelbroker service memory utilization exceeds 90%"
  alarm_actions       = [aws_sns_topic.tunnelbroker_error_topic.arn]
  namespace           = "AWS/ECS"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.tunnelbroker.name
  }
}


resource "aws_cloudwatch_metric_alarm" "tunnelbroker_cpu_utilization" {
  alarm_name          = "TunnelbrokerCPUUtilizationAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Alarm when Tunnelbroker service CPU utilization exceeds 90%"
  alarm_actions       = [aws_sns_topic.tunnelbroker_error_topic.arn]
  namespace           = "AWS/ECS"
  dimensions = {
    ClusterName = aws_ecs_cluster.comm_services.name
    ServiceName = aws_ecs_service.tunnelbroker.name
  }
}
