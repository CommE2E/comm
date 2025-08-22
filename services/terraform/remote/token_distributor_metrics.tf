locals {
  token_distributor_metrics = {
    ActiveConnections      = { name = "ActiveConnections", pattern = "TokenDistributor_ActiveConnections" },
    TotalTokensCount       = { name = "TotalTokensCount", pattern = "TokenDistributor_TotalTokensCount" },
    TokenClaimed           = { name = "TokenClaimed", pattern = "TokenDistributor_TokenClaimed" },
    TokenReleased          = { name = "TokenReleased", pattern = "TokenDistributor_TokenReleased" },
    TokenClaimFailure      = { name = "TokenClaimFailure", pattern = "TokenDistributor_TokenClaimFailure" },
    OrphanedTokensFound    = { name = "OrphanedTokensFound", pattern = "TokenDistributor_OrphanedTokensFound" },
    DeadConnectionsCleaned = { name = "DeadConnectionsCleaned", pattern = "TokenDistributor_DeadConnectionsCleaned" },
    ConnectionFailure      = { name = "ConnectionFailure", pattern = "TokenDistributor_ConnectionFailure" },
    InstanceStarted        = { name = "InstanceStarted", pattern = "TokenDistributor_InstanceStarted" }
  }
}

# CloudWatch Log Metric Filters for TokenDistributor metrics
resource "aws_cloudwatch_log_metric_filter" "token_distributor_metrics" {
  for_each = local.token_distributor_metrics

  name           = "TokenDistributor${each.value.name}"
  pattern        = "{ $.fields.metricType = \"${each.value.pattern}\" }"
  log_group_name = "/ecs/tunnelbroker-task-def"

  metric_transformation {
    name      = "TokenDistributor${each.value.name}"
    namespace = "TokenDistributor"
    value     = "$.fields.metricValue"
    dimensions = {
      InstanceId = "$.fields.instanceId"
    }
  }
}

# Special metric filters with additional dimensions
resource "aws_cloudwatch_log_metric_filter" "token_distributor_connection_failures_by_type" {
  name           = "TokenDistributorConnectionFailureByType"
  pattern        = "{ $.fields.metricType = \"TokenDistributor_ConnectionFailure\" }"
  log_group_name = "/ecs/tunnelbroker-task-def"

  metric_transformation {
    name      = "TokenDistributorConnectionFailureByType"
    namespace = "TokenDistributor"
    value     = "$.fields.metricValue"
    dimensions = {
      InstanceId = "$.fields.instanceId"
      ErrorType  = "$.fields.errorType"
    }
  }
}
