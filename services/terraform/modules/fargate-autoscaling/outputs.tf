output "autoscaling_target_arn" {
  description = "ARN of the auto-scaling target"
  value       = var.create_resources ? aws_appautoscaling_target.service[0].arn : null
}

output "cpu_policy_arn" {
  description = "ARN of the CPU scaling policy"
  value       = var.create_resources ? aws_appautoscaling_policy.cpu_target_tracking[0].arn : null
}

output "memory_policy_arn" {
  description = "ARN of the memory scaling policy"
  value       = var.create_resources ? aws_appautoscaling_policy.memory_target_tracking[0].arn : null
}

output "scaling_configuration" {
  description = "Summary of scaling configuration"
  value = var.create_resources ? {
    service_name  = var.service_name
    min_capacity  = var.min_capacity
    max_capacity  = var.max_capacity
    cpu_target    = var.cpu_target
    memory_target = var.memory_target
  } : null
}