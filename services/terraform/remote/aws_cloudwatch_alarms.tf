locals {
  lambda_error_subscribed_email = "error-reports@comm.app"
  lambda_error_threshold        = "2"

  identity_error_patterns = {
    Search       = { name = "Search", pattern = "Search Error:*" },
    Database     = { name = "DB", pattern = "*DB Error:*" },
    GrpcServices = { name = "GrpcServices", pattern = "gRPC Services Error:*" },
    Siwe         = { name = "Siwe", pattern = "SIWE Error:*" },
    Tunnelbroker = { name = "Tunnelbroker", pattern = "Tunnelbroker Error:*" }
  }
}

resource "aws_sns_topic" "lambda_alarm_topic" {
  name = "lambda-error-alarm-topic"
}

resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.lambda_alarm_topic.arn
  protocol  = "email"
  endpoint  = local.lambda_error_subscribed_email
}

resource "aws_cloudwatch_metric_alarm" "lambda_error_alarm" {
  alarm_name          = "search-index-lambda-error-alarm"
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

resource "aws_cloudwatch_log_metric_filter" "identity_error_filters" {
  for_each = local.identity_error_patterns

  name           = "Identity${each.value.name}ErrorCount"
  pattern        = "{ $.level = \"ERROR\" && $.fields.message = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/identity-service-task-def"

  metric_transformation {
    name      = "Identity${each.value.name}ErrorCount"
    namespace = "IdentityServiceMetricFilters"
    value     = "1"
  }
}
