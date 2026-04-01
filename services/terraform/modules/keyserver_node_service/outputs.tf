output "service_load_balancer_dns_name" {
  value = (
    local.dedicated_ingress_enabled ? aws_lb.service[0].dns_name : null
  )
}

output "service_target_group_arn" {
  value = local.public_ingress_enabled ? aws_lb_target_group.service[0].arn : null
}
