moved {
  from = aws_cloudwatch_log_group.backup_service_fargate
  to   = aws_cloudwatch_log_group.backup_service_fargate[0]
}

moved {
  from = aws_sns_topic.backup_error_topic
  to   = aws_sns_topic.backup_error_topic[0]
}

moved {
  from = aws_sns_topic_subscription.backup_email_subscription
  to   = aws_sns_topic_subscription.backup_email_subscription[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.backup_memory_utilization
  to   = aws_cloudwatch_metric_alarm.backup_memory_utilization[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.backup_cpu_utilization
  to   = aws_cloudwatch_metric_alarm.backup_cpu_utilization[0]
}

moved {
  from = aws_ecs_task_definition.backup_service_fargate
  to   = aws_ecs_task_definition.backup_service_fargate[0]
}

moved {
  from = aws_ecs_service.backup_service_fargate
  to   = aws_ecs_service.backup_service_fargate[0]
}

moved {
  from = aws_security_group.backup_service
  to   = aws_security_group.backup_service[0]
}

moved {
  from = aws_cloudwatch_log_group.electron_update
  to   = aws_cloudwatch_log_group.electron_update[0]
}

moved {
  from = aws_sns_topic.blob_error_topic
  to   = aws_sns_topic.blob_error_topic[0]
}

moved {
  from = aws_sns_topic_subscription.blob_email_subscription
  to   = aws_sns_topic_subscription.blob_email_subscription[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.blob_memory_utilization
  to   = aws_cloudwatch_metric_alarm.blob_memory_utilization[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.blob_cpu_utilization
  to   = aws_cloudwatch_metric_alarm.blob_cpu_utilization[0]
}

moved {
  from = aws_ecs_task_definition.electron_update
  to   = aws_ecs_task_definition.electron_update[0]
}

moved {
  from = aws_ecs_service.electron_update
  to   = aws_ecs_service.electron_update[0]
}

moved {
  from = aws_security_group.electron_update
  to   = aws_security_group.electron_update[0]
}

moved {
  from = aws_cloudwatch_log_group.blob_service_fargate
  to   = aws_cloudwatch_log_group.blob_service_fargate[0]
}

moved {
  from = aws_ecs_task_definition.blob_service_fargate
  to   = aws_ecs_task_definition.blob_service_fargate[0]
}

moved {
  from = aws_ecs_service.blob_service_fargate
  to   = aws_ecs_service.blob_service_fargate[0]
}

moved {
  from = aws_security_group.blob_service
  to   = aws_security_group.blob_service[0]
}

moved {
  from = aws_cloudwatch_log_group.identity_service_fargate
  to   = aws_cloudwatch_log_group.identity_service_fargate[0]
}

moved {
  from = aws_sns_topic.identity_error_topic
  to   = aws_sns_topic.identity_error_topic[0]
}

moved {
  from = aws_sns_topic_subscription.identity_email_subscription
  to   = aws_sns_topic_subscription.identity_email_subscription[0]
}

moved {
  from = aws_ecs_task_definition.identity_service_fargate
  to   = aws_ecs_task_definition.identity_service_fargate[0]
}

moved {
  from = aws_ecs_service.identity_service_fargate
  to   = aws_ecs_service.identity_service_fargate[0]
}

moved {
  from = aws_security_group.identity_service
  to   = aws_security_group.identity_service[0]
}

moved {
  from = aws_cloudwatch_log_group.reports_service
  to   = aws_cloudwatch_log_group.reports_service[0]
}

moved {
  from = aws_ecs_task_definition.reports_service
  to   = aws_ecs_task_definition.reports_service[0]
}

moved {
  from = aws_ecs_service.reports_service
  to   = aws_ecs_service.reports_service[0]
}

moved {
  from = aws_security_group.reports_service
  to   = aws_security_group.reports_service[0]
}

moved {
  from = aws_cloudwatch_log_group.tunnelbroker_fargate
  to   = aws_cloudwatch_log_group.tunnelbroker_fargate[0]
}

moved {
  from = aws_sns_topic.tunnelbroker_error_topic
  to   = aws_sns_topic.tunnelbroker_error_topic[0]
}

moved {
  from = aws_sns_topic_subscription.tunnelbroker_email_subscription
  to   = aws_sns_topic_subscription.tunnelbroker_email_subscription[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.tunnelbroker_memory_utilization
  to   = aws_cloudwatch_metric_alarm.tunnelbroker_memory_utilization[0]
}

moved {
  from = aws_cloudwatch_metric_alarm.tunnelbroker_cpu_utilization
  to   = aws_cloudwatch_metric_alarm.tunnelbroker_cpu_utilization[0]
}

moved {
  from = aws_ecs_task_definition.tunnelbroker_fargate
  to   = aws_ecs_task_definition.tunnelbroker_fargate[0]
}

moved {
  from = aws_ecs_service.tunnelbroker_fargate
  to   = aws_ecs_service.tunnelbroker_fargate[0]
}

moved {
  from = aws_security_group.tunnelbroker
  to   = aws_security_group.tunnelbroker[0]
}

moved {
  from = aws_cloudwatch_log_group.blob_cleanup
  to   = aws_cloudwatch_log_group.blob_cleanup[0]
}

moved {
  from = aws_ecs_task_definition.blob_cleanup
  to   = aws_ecs_task_definition.blob_cleanup[0]
}

moved {
  from = aws_scheduler_schedule.blob_cleanup
  to   = aws_scheduler_schedule.blob_cleanup[0]
}

moved {
  from = aws_iam_role_policy_attachment.blob_cleanup_scheduler
  to   = aws_iam_role_policy_attachment.blob_cleanup_scheduler[0]
}

moved {
  from = aws_iam_policy.blob_cleanup_scheduler
  to   = aws_iam_policy.blob_cleanup_scheduler[0]
}

moved {
  from = aws_cloudwatch_log_group.sync_identity_search
  to   = aws_cloudwatch_log_group.sync_identity_search[0]
}

moved {
  from = aws_ecs_task_definition.sync_identity_search
  to   = aws_ecs_task_definition.sync_identity_search[0]
}

moved {
  from = aws_scheduler_schedule.sync_identity_search
  to   = aws_scheduler_schedule.sync_identity_search[0]
}

moved {
  from = aws_iam_role_policy_attachment.sync_identity_search_scheduler
  to   = aws_iam_role_policy_attachment.sync_identity_search_scheduler[0]
}

moved {
  from = aws_iam_policy.sync_identity_search_scheduler
  to   = aws_iam_policy.sync_identity_search_scheduler[0]
}
